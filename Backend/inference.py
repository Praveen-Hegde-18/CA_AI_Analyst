"""
Cricket shot inference pipeline — extracted from files/inference_1305_shot.ipynb.

Models are loaded once at import time. Public API:
    run_inference(video_path: str, output_path: str) -> dict | None
"""

import os
import json
import cv2
import numpy as np
import torch
import torch.nn as nn
import anthropic
import mediapipe as mp
from pathlib import Path
from torchvision import transforms
from torchvision.models import MobileNet_V2_Weights, mobilenet_v2
from PIL import Image

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent   # d:\CA_POC

SHOT_MODEL_PATH    = ROOT / "files"        / "best_model.pth"
IMPACT_CKPT        = ROOT / "impact_cls_550_data.pt"
IDEAL_POSES_PATH   = ROOT / "ML_layer" / "ideal_poses.npy"
IDEAL_POSES_RAW_PATH = ROOT / "ML_layer" / "ideal_poses_raw.npy"

# ── Constants ──────────────────────────────────────────────────────────────
TARGET_LEN         = 100
CONF_THRESHOLD     = 0.80
IMPACT_CONF_THRESH = 0.70
COLOR_IMPACT       = (0, 50, 255)

LABEL_NAMES = [
    'Cover Drive',
    'Cut',
    'Flick',
    'Forward Defence',
    'Pull',
    'Sweep',
]
INPUT_SIZE  = 214
NUM_CLASSES = 6
DEVICE      = 'cuda' if torch.cuda.is_available() else 'cpu'

LABEL_COLORS = {
    'Cover Drive':      ( 50, 205,  50),
    'Cut':              (255, 215,   0),
    'Flick':            ( 80, 220, 180),
    'Forward Defence':  (  0, 191, 255),
    'Pull':             ( 60, 100, 220),
    'Sweep':            (200,  80, 220),
    'Not Identified':   (160, 160, 160),
}
QUALITY_COLOR = {
    'Correct':   ( 50, 205,  50),
    'Average':   (  0, 191, 255),
    'Incorrect': ( 50,  50, 220),
}

ROI_W_FRAC = 0.40
ROI_H_FRAC = 0.80

PHASE_OFFSETS = {
    'backswing':      (-35, -5),
    'impact':         ( -4,  4),
    'follow_through': (  5, 40),
}
PHASE_WEIGHTS = dict(backswing=0.25, impact=0.50, follow_through=0.25)

MODEL_F1_SCORES = {
    'Cover Drive':     0.78,
    'Cut':             0.73,
    'Flick':           0.82,
    'Forward Defence': 0.78,
    'Pull':            0.76,
    'Sweep':           0.91,
}

# ── Landmark map ───────────────────────────────────────────────────────────
MP = dict(
    L_SHOULDER=11, R_SHOULDER=12,
    L_ELBOW=13,    R_ELBOW=14,
    L_WRIST=15,    R_WRIST=16,
    L_HIP=23,      R_HIP=24,
    L_KNEE=25,     R_KNEE=26,
    L_ANKLE=27,    R_ANKLE=28,
    NOSE=0,
)

RELEVANT_KP_INDICES = sorted(set(MP.values()))
N_RELEVANT_KP       = len(RELEVANT_KP_INDICES)

# ── Shot classifier ────────────────────────────────────────────────────────

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size=384, num_layers=3, num_classes=6, dropout=0.4):
        super().__init__()
        self.input_norm = nn.LayerNorm(input_size)
        self.lstm = nn.LSTM(
            input_size, hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=True,
        )
        self.attn    = nn.Linear(hidden_size * 2, 1)
        self.norm    = nn.LayerNorm(hidden_size * 2)
        self.dropout = nn.Dropout(dropout)
        self.fc      = nn.Linear(hidden_size * 2, num_classes)

    def forward(self, x):
        x = self.input_norm(x)
        outputs, _ = self.lstm(x)
        w   = torch.softmax(self.attn(outputs), dim=1)
        out = (outputs * w).sum(dim=1)
        out = self.norm(out)
        out = self.dropout(out)
        return self.fc(out)


_ckpt     = torch.load(str(SHOT_MODEL_PATH), map_location=DEVICE)
_lstm_ih  = _ckpt.get('lstm.weight_ih_l0')
_fc_w     = _ckpt.get('fc.weight')
_hidden   = int(_lstm_ih.shape[0] / 4) if _lstm_ih is not None else 384
_ckpt_cls = int(_fc_w.shape[0])        if _fc_w    is not None else NUM_CLASSES

_LABEL_OFFSET = 1 if _ckpt_cls == 7 else 0

shot_model = LSTMModel(input_size=INPUT_SIZE, hidden_size=_hidden, num_classes=_ckpt_cls)
shot_model.load_state_dict(_ckpt)
shot_model.eval().to(DEVICE)

print(f'Shot model ready — hidden={_hidden}, ckpt_classes={_ckpt_cls}, device={DEVICE}')

# ── Impact model (MobileNetV2) ─────────────────────────────────────────────

def build_impact_model(device):
    m = mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
    for idx, block in enumerate(m.features):
        for p in block.parameters():
            p.requires_grad = idx >= 12
    m.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(1280, 128),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(128, 2),
    )
    return m.to(device)


_imp_ckpt          = torch.load(str(IMPACT_CKPT), map_location=DEVICE)
impact_class_names = _imp_ckpt['class_names']
impact_img_size    = tuple(_imp_ckpt['image_size'])
impact_mean        = _imp_ckpt['mean']
impact_std         = _imp_ckpt['std']
impact_idx_cls     = impact_class_names.index('impact')

impact_model = build_impact_model(DEVICE)
impact_model.load_state_dict(_imp_ckpt['model_state_dict'])
impact_model.eval()

impact_transform = transforms.Compose([
    transforms.Resize(impact_img_size),
    transforms.ToTensor(),
    transforms.Normalize(mean=impact_mean, std=impact_std),
])

print(f'Impact model ready — classes: {impact_class_names}')

# ── MediaPipe ──────────────────────────────────────────────────────────────
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils
pose    = mp_pose.Pose(static_image_mode=False)

# ── Ideal poses ────────────────────────────────────────────────────────────
ideal_poses     = np.load(str(IDEAL_POSES_PATH),     allow_pickle=True).item()
ideal_poses_raw = np.load(str(IDEAL_POSES_RAW_PATH), allow_pickle=True).item()

print('Ideal poses loaded.')

# ── Pose utilities ─────────────────────────────────────────────────────────

def reshape_kp(seq):
    return seq.reshape(-1, 33, 3)

def calculate_angle(a, b, c):
    ba = a - b; bc = c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))

def sample_frames(seq, n=TARGET_LEN):
    if len(seq) == 0:
        return np.zeros((n, 99))
    return seq[np.linspace(0, len(seq)-1, n).astype(int)]

def normalize_pose(seq):
    s = seq.copy().reshape(-1, 33, 3)
    for i, kp in enumerate(s):
        hip  = (kp[MP['L_HIP']] + kp[MP['R_HIP']]) / 2
        kp  -= hip
        kp  /= (np.linalg.norm(kp[MP['L_SHOULDER']] - kp[MP['L_HIP']]) + 1e-6)
        s[i] = kp
    return s.reshape(-1, 99)

def detect_handedness(seq):
    s   = seq.reshape(-1, 33, 3)
    mid = len(s) // 2
    w   = s[max(0, mid-5): mid+5]
    return 'right' if np.mean(w[:, MP['R_WRIST'], 1]) >= np.mean(w[:, MP['L_WRIST'], 1]) else 'left'

def mirror_keypoints_flat(seq):
    s = seq.copy().reshape(-1, 33, 3)
    s[:, :, 0] = -s[:, :, 0]
    for l, r in [(11,12),(13,14),(15,16),(23,24),(25,26),(27,28)]:
        s[:, [l, r]] = s[:, [r, l]]
    return s.reshape(-1, 99)

# ── Feature engineering ────────────────────────────────────────────────────

def extract_angles(seq):
    out = []
    for kp in reshape_kp(seq):
        out.append([
            calculate_angle(kp[MP['L_SHOULDER']], kp[MP['L_ELBOW']], kp[MP['L_WRIST']]),
            calculate_angle(kp[MP['R_SHOULDER']], kp[MP['R_ELBOW']], kp[MP['R_WRIST']]),
            calculate_angle(kp[MP['L_HIP']],      kp[MP['L_KNEE']], kp[MP['L_ANKLE']]),
            calculate_angle(kp[MP['R_HIP']],      kp[MP['R_KNEE']], kp[MP['R_ANKLE']]),
            calculate_angle(kp[MP['L_KNEE']], kp[MP['L_ANKLE']], kp[MP['L_ANKLE']] + np.array([0.1,0,0])),
            calculate_angle(kp[MP['R_KNEE']], kp[MP['R_ANKLE']], kp[MP['R_ANKLE']] + np.array([0.1,0,0])),
        ])
    return np.array(out)

def extract_velocity(seq):
    v = np.diff(seq, axis=0)
    return np.vstack([v, v[-1]])

def extract_cricket_features(seq):
    out = []
    for kp in reshape_kp(seq):
        bat_vec   = kp[MP['R_WRIST']] - kp[MP['R_ELBOW']]
        bat_angle = np.degrees(np.arctan2(bat_vec[1], bat_vec[0]))
        hip_w     = abs(kp[MP['L_HIP'], 0] - kp[MP['R_HIP'], 0]) + 1e-6
        foot_lead = (kp[MP['R_ANKLE'], 0] - kp[MP['L_ANKLE'], 0]) / hip_w
        body_vec   = kp[MP['R_SHOULDER']] - kp[MP['R_HIP']]
        body_angle = np.degrees(np.arctan2(body_vec[1], body_vec[0]))
        head_knee  = abs(kp[MP['NOSE'], 0] - kp[MP['R_KNEE'], 0])
        hip_y     = (kp[MP['L_HIP'], 1] + kp[MP['R_HIP'], 1]) / 2
        sh_y      = (kp[MP['L_SHOULDER'], 1] + kp[MP['R_SHOULDER'], 1]) / 2
        torso     = abs(sh_y - hip_y) + 1e-6
        w_height  = (hip_y - kp[MP['R_WRIST'], 1]) / torso
        hip_vec   = kp[MP['R_HIP']] - kp[MP['L_HIP']]
        hip_rot   = np.degrees(np.arctan2(hip_vec[2], hip_vec[0]))
        sh_vec    = kp[MP['R_SHOULDER']] - kp[MP['L_SHOULDER']]
        sh_rot    = np.degrees(np.arctan2(sh_vec[2], sh_vec[0]))
        knee_bend = calculate_angle(kp[MP['R_HIP']], kp[MP['R_KNEE']], kp[MP['R_ANKLE']])
        elbow_gap = np.linalg.norm(kp[MP['L_WRIST']] - kp[MP['R_WRIST']])
        head_tilt = kp[MP['NOSE'], 1] - sh_y
        out.append([bat_angle, foot_lead, body_angle, head_knee,
                    w_height, hip_rot, sh_rot, knee_bend, elbow_gap, head_tilt])
    return np.array(out)

def build_features(seq):
    f = np.concatenate([seq, extract_velocity(seq), extract_angles(seq), extract_cricket_features(seq)], axis=1)
    assert f.shape[1] == 214, f'Feature mismatch: {f.shape[1]}'
    return f

# ── Phase slicing ──────────────────────────────────────────────────────────

def slice_phase_raw(kp_seq, impact_idx, phase):
    lo, hi = PHASE_OFFSETS[phase]
    T      = len(kp_seq)
    start  = max(0, impact_idx + lo)
    end    = min(T, impact_idx + hi + 1)
    if end - start < 3:
        start = max(0, impact_idx + lo - 3)
        end   = min(T, impact_idx + hi + 3)
    seg = kp_seq[start:end]
    return seg if len(seg) > 0 else kp_seq[max(0, impact_idx-2): impact_idx+3]

def resample_to(seg, n):
    if len(seg) == 0:
        return np.zeros((n, seg.shape[-1]))
    idx = np.linspace(0, len(seg)-1, n).astype(int)
    return seg[idx]

def slice_phase_for_rules(kp_norm_100, impact_idx, total_valid_frames, phase):
    lo, hi = PHASE_OFFSETS[phase]
    s_raw  = max(0, impact_idx + lo)
    e_raw  = min(total_valid_frames, impact_idx + hi + 1)
    s100   = int(round(s_raw / total_valid_frames * 100))
    e100   = int(round(e_raw / total_valid_frames * 100))
    s100   = max(0,       min(99, s100))
    e100   = max(s100+1,  min(100, e100))
    return kp_norm_100[s100:e100]

def _velocity_impact_fallback(valid_kp):
    wrists = (valid_kp[:, MP['L_WRIST']*3 : MP['L_WRIST']*3+3] +
              valid_kp[:, MP['R_WRIST']*3 : MP['R_WRIST']*3+3]) / 2
    speed  = np.linalg.norm(np.diff(wrists, axis=0), axis=1)
    return int(np.argmax(speed)) + 1

# ── Scoring ────────────────────────────────────────────────────────────────

def cosine_sim(a, b):
    a, b = a.flatten(), b.flatten()
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-6))

def best_of_k_sim(query_phase, ideal_phase_clusters):
    return max(cosine_sim(query_phase, c) for c in ideal_phase_clusters)

def compute_pose_similarity(valid_kp_norm, impact_idx, pred_idx):
    score = 0.0
    for phase, weight in PHASE_WEIGHTS.items():
        seg_raw  = slice_phase_raw(valid_kp_norm, impact_idx, phase)
        seg_feat = build_features(seg_raw)
        ideals   = ideal_poses[pred_idx][phase]
        seg_r    = resample_to(seg_feat, ideals.shape[1])
        score   += weight * best_of_k_sim(seg_r, ideals)
    return float(np.clip(score, 0.0, 1.0))

def compute_keypoint_error(valid_kp_norm, impact_idx, pred_idx, threshold=0.15):
    try:
        seg_raw    = slice_phase_raw(valid_kp_norm, impact_idx, 'impact')
        ideals_raw = ideal_poses_raw[pred_idx]['impact']
        T_med      = ideals_raw.shape[1]
        seg_r      = resample_to(seg_raw, T_med)
        best_k     = int(np.argmax([cosine_sim(seg_r, ideals_raw[k]) for k in range(len(ideals_raw))]))
        ideal      = ideals_raw[best_k]
        diff       = (seg_r - ideal).reshape(T_med, 33, 3)
        rel_diff   = diff[:, RELEVANT_KP_INDICES, :]
        per_kp     = np.mean(np.linalg.norm(rel_diff, axis=2), axis=0)
        return round(float(np.mean(per_kp)), 4), int(np.sum(per_kp > threshold))
    except Exception as e:
        print(f'[KP Error] {e}')
        return 0.0, 0

# ── Biomechanical rules ────────────────────────────────────────────────────

def mean_angle(kp_seq, a, b, c):
    return float(np.mean([calculate_angle(kp[a], kp[b], kp[c]) for kp in kp_seq]))

def compute_rule_score(kp_norm_100, impact_idx, total_valid_frames, shot_name):
    imp_phase = slice_phase_for_rules(kp_norm_100, impact_idx, total_valid_frames, 'impact')
    imp_kp    = reshape_kp(imp_phase)

    def angle_rule(name, a, b, c, threshold, direction='above', weight=1.0):
        val    = mean_angle(imp_kp, a, b, c)
        passed = val > threshold if direction == 'above' else val < threshold
        return dict(name=name, passed=passed, value=round(val, 1), weight=weight)

    def ratio_rule(name, val, threshold, direction='above', weight=1.0):
        passed = val > threshold if direction == 'above' else val < threshold
        return dict(name=name, passed=passed, value=round(val, 3), weight=weight)

    hip_w      = float(np.mean([abs(kp[MP['L_HIP'],0]-kp[MP['R_HIP'],0]) for kp in imp_kp])) + 1e-6
    foot_lead  = float(np.mean([(kp[MP['R_ANKLE'],0]-kp[MP['L_ANKLE'],0])/hip_w for kp in imp_kp]))
    nose_knee  = float(np.mean([abs(kp[MP['NOSE'],0]-kp[MP['R_KNEE'],0]) for kp in imp_kp]))
    sh_y_arr   = [(kp[MP['L_SHOULDER'],1]+kp[MP['R_SHOULDER'],1])/2 for kp in imp_kp]
    hip_y_arr  = [(kp[MP['L_HIP'],1]+kp[MP['R_HIP'],1])/2 for kp in imp_kp]
    torso_arr  = [abs(s-h)+1e-6 for s,h in zip(sh_y_arr, hip_y_arr)]
    wrist_h    = float(np.mean([(h-kp[MP['R_WRIST'],1])/t for kp,h,t in zip(imp_kp,hip_y_arr,torso_arr)]))
    bat_ang    = float(np.mean([np.degrees(np.arctan2(
                    (kp[MP['R_WRIST']]-kp[MP['R_ELBOW']])[1],
                    (kp[MP['R_WRIST']]-kp[MP['R_ELBOW']])[0])) for kp in imp_kp]))
    base_y     = imp_kp[0][MP['L_ANKLE'], 1]
    lift_frac  = float(np.mean([abs(kp[MP['L_ANKLE'],1]-base_y)/(abs(base_y)+1e-6) < 0.10 for kp in imp_kp]))
    cross_bat  = abs(bat_ang)

    RULES = {
        'Cover Drive':     [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 140, weight=1.0),
            ratio_rule('Front foot forward',   foot_lead, 0.5,  weight=1.0),
            ratio_rule('Head over knee',       nose_knee, 0.2, 'below', weight=0.8),
            ratio_rule('Wrist height',         wrist_h,   0.0,  weight=0.8),
            ratio_rule('Bat angle (downward)', bat_ang,  -30,  'below', weight=0.9),
        ],
        'Cut':             [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 130, weight=1.0),
            ratio_rule('Back foot grounded',   lift_frac, 0.65, weight=1.0),
            ratio_rule('Horizontal bat plane', cross_bat, 40,  'below', weight=0.9),
            ratio_rule('Wrist height',         wrist_h,   0.3,  weight=0.8),
        ],
        'Flick':           [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 115, weight=1.0),
            ratio_rule('Wrist height',         wrist_h,   0.1,  weight=0.8),
            ratio_rule('Back foot grounded',   lift_frac, 0.55, weight=0.8),
            ratio_rule('Upward bat path',      bat_ang,   20,   weight=0.9),
        ],
        'Forward Defence': [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 130, weight=1.0),
            ratio_rule('Front foot forward',   foot_lead, 0.4,  weight=1.0),
            ratio_rule('Head over knee',       nose_knee, 0.15,'below', weight=0.9),
            ratio_rule('Wrist low at contact', wrist_h,  -0.2, 'below', weight=0.8),
        ],
        'Pull':            [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 125, weight=1.0),
            ratio_rule('Back foot grounded',   lift_frac, 0.60, weight=1.0),
            ratio_rule('Horizontal bat plane', cross_bat, 45,  'below', weight=0.9),
            ratio_rule('Wrist high at impact', wrist_h,   0.5,  weight=0.8),
        ],
        'Sweep':           [
            angle_rule('Elbow extension',      MP['L_SHOULDER'], MP['L_ELBOW'], MP['L_WRIST'], 120, weight=1.0),
            ratio_rule('Horizontal bat plane', cross_bat, 35,  'below', weight=0.9),
            ratio_rule('Wrist very low',       wrist_h,   0.2, 'below', weight=0.9),
            angle_rule('Knee bend',            MP['R_HIP'], MP['R_KNEE'], MP['R_ANKLE'], 120, 'below', weight=0.9),
        ],
    }

    rules = RULES.get(shot_name, [])
    if not rules:
        return 0.5, []
    total_w = sum(r['weight'] for r in rules)
    score   = sum(r['weight'] * float(r['passed']) for r in rules) / total_w
    return float(np.clip(score, 0.0, 1.0)), rules

def generate_feedback(rules):
    failed = sorted([r for r in rules if not r['passed']],
                    key=lambda r: r['weight'], reverse=True)
    msgs = {
        'Elbow extension':      'Straighten your leading arm at contact.',
        'Front foot forward':   'Step further down the pitch.',
        'Back foot grounded':   'Keep your rear foot planted through impact.',
        'Head over knee':       'Get your head closer over the front knee.',
        'Wrist low at contact': 'Keep your hands down at contact.',
        'Wrist high at impact': 'Attack the ball with your hands higher.',
        'Horizontal bat plane': 'Keep the bat flatter through the hitting zone.',
        'Knee bend':            'Bend your front knee lower for the sweep.',
        'Upward bat path':      'Flick your wrists upward through the ball.',
        'Wrist height':         'Adjust wrist height for this shot.',
        'Wrist very low':       'Get your hands much lower for the sweep.',
        'Bat angle (downward)': 'Drive the ball downward - keep bat face angled down.',
    }
    tips = [f"[!] {msgs.get(r['name'], r['name'] + ': ' + str(r['value']))}" for r in failed[:3]]
    return tips if tips else ['[OK] Technique looks solid.']

# ── LLM coaching analysis ──────────────────────────────────────────────────

def analyze_shot_with_llm(result: dict) -> str:
    if result is None:
        return 'No result to analyze.'
    if result.get('shot') == 'Not Identified':
        return 'Shot could not be identified with sufficient confidence. No coaching analysis available.'
    try:
        client  = anthropic.Anthropic()
        shot    = result['shot']
        conf    = result['confidence']
        pose    = result['pose']
        quality = pose['quality']
        score   = pose['score']
        rule_sc = pose['rule_score']
        sim     = pose['similarity']
        phases  = pose['phase_scores']
        tips    = result['feedback']

        user_content = (
            f"Cricket shot analysis:\n"
            f"Shot: {shot}  Confidence: {conf:.1%}  Quality: {quality}\n"
            f"Pose score: {score:.2f}  (rule {rule_sc:.2f}, similarity {sim:.2f})\n"
            f"Phase scores: backswing {phases.get('backswing',0):.2f}, "
            f"impact {phases.get('impact',0):.2f}, "
            f"follow-through {phases.get('follow_through',0):.2f}\n"
            f"Coaching flags: {'; '.join(tips)}\n\n"
            f"Write a plain-text coaching summary in exactly 3 sentences. "
            f"Sentence 1: what the batter did well. "
            f"Sentence 2: the single most important flaw to fix. "
            f"Sentence 3: one specific drill or cue to fix it. "
            f"ASCII characters only - no dashes longer than a hyphen, no curly quotes, no special symbols."
        )
        response = client.messages.create(
            model='claude-opus-4-7',
            max_tokens=300,
            system=[{
                "type": "text",
                "text": (
                    "You are a cricket batting coach. Reply in plain ASCII text only. "
                    "No markdown, no asterisks, no bullet points, no em-dashes, "
                    "no curly quotes. Use only standard keyboard characters."
                ),
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": user_content}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f'[LLM] Error: {e}')
        return f'Coaching analysis unavailable ({type(e).__name__}).'

# ── HUD drawing ────────────────────────────────────────────────────────────

def draw_rounded_rect(img, x, y, w, h, r, color, alpha=0.60):
    overlay = img.copy()
    cv2.rectangle(overlay, (x+r, y),   (x+w-r, y+h),   color, -1)
    cv2.rectangle(overlay, (x,   y+r), (x+w,   y+h-r), color, -1)
    for cx, cy in [(x+r,y+r),(x+w-r,y+r),(x+r,y+h-r),(x+w-r,y+h-r)]:
        cv2.circle(overlay, (cx, cy), r, color, -1)
    cv2.addWeighted(overlay, alpha, img, 1-alpha, 0, img)

def draw_bar(img, x, y, w, h, val, color):
    cv2.rectangle(img, (x, y), (x+w, y+h), (60,60,60), -1)
    f = int(w * max(0.0, min(1.0, val)))
    if f > 0:
        cv2.rectangle(img, (x, y), (x+f, y+h), color, -1)

def put_text(img, text, x, y, scale=0.55, color=(255,255,255), thickness=1):
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_DUPLEX, scale, (0,0,0),  thickness+2, cv2.LINE_AA)
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_DUPLEX, scale, color,    thickness,   cv2.LINE_AA)

def _wrap(text, max_chars):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) <= max_chars:
            cur = (cur + ' ' + w).strip()
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines if lines else [text[:max_chars]]

def draw_llm_panel(frame, summary):
    H, W  = frame.shape[:2]
    pw    = min(420, max(300, W // 3))
    px    = W - pw - 14
    py    = 14
    lh    = 20
    cpl   = max(30, pw // 8)
    clean = summary
    rows  = []
    for sent in clean.split('. '):
        sent = sent.strip().rstrip('.')
        if not sent:
            continue
        for ln in _wrap(sent + '.', cpl):
            rows.append(ln)
        rows.append('')
    while rows and not rows[-1]:
        rows.pop()
    if not rows:
        rows = [clean[:cpl]]
    ph = 30 + len(rows) * lh + 12
    draw_rounded_rect(frame, px, py, pw, ph, 8, (15, 15, 15), alpha=0.75)
    cv2.rectangle(frame, (px, py), (px + pw, py + 24), (50, 35, 5), -1)
    put_text(frame, 'COACHING ANALYSIS', px + 8, py + 17, scale=0.44, color=(255, 200, 80))
    y = py + 34
    for row in rows:
        if row:
            put_text(frame, row, px + 6, y, scale=0.37, color=(215, 215, 215), thickness=1)
        y += lh

def draw_hud(frame, result, frame_idx, total_frames, in_roi, raw_impact_frame=None):
    pw, ph, px, py = 310, 232, 14, 14
    shot_name = result['shot']
    col       = LABEL_COLORS.get(shot_name, (180,180,180))
    pose_info = result['pose']
    quality   = pose_info['quality']
    qcol      = QUALITY_COLOR.get(quality, (180,180,180))
    H, W      = frame.shape[:2]

    draw_rounded_rect(frame, px, py, pw, ph, 10, (20,20,20))
    cv2.rectangle(frame, (px, py), (px+pw, py+28), col, -1)
    put_text(frame, 'CRICKET SHOT ANALYSER', px+10, py+19, scale=0.48, color=(10,10,10))
    put_text(frame, shot_name.upper(), px+10, py+52, scale=0.65, color=col, thickness=2)

    conf = result['confidence']
    put_text(frame, f'Confidence  {conf*100:.1f}%', px+10, py+78, color=(200,200,200))
    draw_bar(frame, px+10, py+84, pw-20, 5, conf, col)

    put_text(frame, f'Quality      {quality}', px+10, py+108, color=qcol)
    score = pose_info['score']
    put_text(frame, f'Pose Score  {score:.2f}', px+10, py+128, color=(200,200,200))
    draw_bar(frame, px+10, py+134, pw-20, 5, score, qcol)

    sim  = pose_info['similarity']
    rule = pose_info['rule_score']
    put_text(frame, f'Similarity {sim:.2f}   Rule {rule:.2f}', px+10, py+156, scale=0.44, color=(160,160,160))

    ps = pose_info.get('phase_scores', {})
    put_text(frame, f'BS:{ps.get("backswing",0):.2f}  IMP:{ps.get("impact",0):.2f}  FT:{ps.get("follow_through",0):.2f}',
             px+10, py+174, scale=0.40, color=(120,120,120))

    if raw_impact_frame is not None:
        ts = raw_impact_frame / (result.get('fps', 30))
        put_text(frame, f'Impact @ frame {raw_impact_frame}  ({ts:.2f}s)',
                 px+10, py+192, scale=0.40, color=COLOR_IMPACT)

    roi_label = 'ROI: IN ZONE' if in_roi else 'ROI: OUT OF ZONE'
    put_text(frame, roi_label, px+10, py+210, scale=0.44, color=col if in_roi else (100,100,100))

    if raw_impact_frame is not None and abs(frame_idx - raw_impact_frame) <= 2:
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (W, H), COLOR_IMPACT, 6)
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
        put_text(frame, 'IMPACT', W//2 - 60, 50, scale=1.1, color=COLOR_IMPACT, thickness=2)

    bar_h = 6
    cv2.rectangle(frame, (0, H-bar_h), (W, H), (40,40,40), -1)
    prog = int(W * frame_idx / max(total_frames-1, 1))
    cv2.rectangle(frame, (0, H-bar_h), (prog, H), col, -1)

def draw_feedback_panel(frame, feedback, px=14, py=252, pw=310):
    draw_rounded_rect(frame, px, py, pw, 18 + 22*len(feedback), 6, (20,20,20), alpha=0.55)
    put_text(frame, 'COACHING TIPS', px+8, py+14, scale=0.40, color=(160,160,160))
    for i, tip in enumerate(feedback):
        put_text(frame, tip[:52], px+8, py+32 + i*22, scale=0.38,
                 color=(255,200,80) if tip.startswith('[!]') else (80,220,80))

def draw_impact_panel(frame, result, py=352, px=14, pw=310):
    impact_det  = result.get('impact_detected', False)
    impact_conf = result.get('impact_confidence', 0.0)
    shot_name   = result.get('shot', '')
    f1_score    = MODEL_F1_SCORES.get(shot_name)

    ph = 74
    H  = frame.shape[0]
    if py + ph > H - 8:
        py = max(4, H - ph - 8)

    draw_rounded_rect(frame, px, py, pw, ph, 6, (20, 20, 20), alpha=0.60)
    put_text(frame, 'SHOT METRICS', px+8, py+14, scale=0.40, color=(160, 160, 160))

    if impact_det:
        imp_text  = f'Impact: YES  conf {impact_conf:.0%}'
        imp_color = (80, 220, 80)
    else:
        imp_text  = 'Impact: NO  (velocity fallback)'
        imp_color = (200, 140, 60)
    put_text(frame, imp_text, px+8, py+36, scale=0.40, color=imp_color)

    if f1_score is not None and shot_name not in ('Not Identified', ''):
        f1_col = (80, 220, 80) if f1_score >= 0.75 else ((255, 200, 80) if f1_score >= 0.60 else (100, 100, 255))
        put_text(frame, f'F1 Score ({shot_name}): {f1_score:.2f}', px+8, py+58, scale=0.40, color=f1_col)
    else:
        put_text(frame, 'F1 Score: N/A', px+8, py+58, scale=0.40, color=(120, 120, 120))

# ── ROI helpers ────────────────────────────────────────────────────────────

def get_roi(W, H):
    rw = int(W * ROI_W_FRAC); rh = int(H * ROI_H_FRAC)
    x1 = (W - rw) // 2;      y1 = (H - rh) // 2
    return x1, y1, x1 + rw, y1 + rh

def is_player_in_roi(landmarks, W, H, roi):
    if landmarks is None:
        return False
    lm = landmarks.landmark
    hx = int(((lm[23].x + lm[24].x) / 2) * W)
    hy = int(((lm[23].y + lm[24].y) / 2) * H)
    x1, y1, x2, y2 = roi
    return x1 <= hx <= x2 and y1 <= hy <= y2

def draw_roi(frame, roi, in_roi, shot_color):
    x1, y1, x2, y2 = roi
    H, W = frame.shape[:2]
    if in_roi:
        darkened = (frame.astype(np.float32) * 0.38).astype(np.uint8)
        darkened[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
        frame[:] = darkened
        cv2.rectangle(frame, (x1-3, y1-3), (x2+3, y2+3), shot_color, 3)
        cv2.rectangle(frame, (x1, y1), (x2, y2), shot_color, 2)
        tick = 20
        for cx, cy, dx, dy in [(x1,y1,1,1),(x2,y1,-1,1),(x1,y2,1,-1),(x2,y2,-1,-1)]:
            cv2.line(frame, (cx, cy), (cx+dx*tick, cy), shot_color, 3)
            cv2.line(frame, (cx, cy), (cx, cy+dy*tick), shot_color, 3)
        badge_y = y1 - 10 if y1 > 24 else y1 + 22
        put_text(frame, 'IN ZONE', x1+6, badge_y, scale=0.48, color=shot_color)
    else:
        dash, gap, color = 18, 8, (200, 200, 200)
        for x in range(x1, x2, dash+gap):
            cv2.line(frame, (x, y1), (min(x+dash, x2), y1), color, 1)
            cv2.line(frame, (x, y2), (min(x+dash, x2), y2), color, 1)
        for y in range(y1, y2, dash+gap):
            cv2.line(frame, (x1, y), (x1, min(y+dash, y2)), color, 1)
            cv2.line(frame, (x2, y), (x2, min(y+dash, y2)), color, 1)
        tick = 16
        for cx, cy, dx, dy in [(x1,y1,1,1),(x2,y1,-1,1),(x1,y2,1,-1),(x2,y2,-1,-1)]:
            cv2.line(frame, (cx, cy), (cx+dx*tick, cy), (255,255,255), 2)
            cv2.line(frame, (cx, cy), (cx, cy+dy*tick), (255,255,255), 2)
        hint = 'POSITION PLAYER HERE'
        (tw, _), _ = cv2.getTextSize(hint, cv2.FONT_HERSHEY_DUPLEX, 0.42, 1)
        put_text(frame, hint, (x1+x2)//2 - tw//2, y2+18, scale=0.42, color=(200,200,200))

# ── Public API ─────────────────────────────────────────────────────────────

def predict_impact(bgr_frame):
    """Returns (is_impact: bool, confidence: float) for a single BGR frame."""
    rgb    = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
    tensor = impact_transform(Image.fromarray(rgb)).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(impact_model(tensor), dim=1)[0]
    conf = probs[impact_idx_cls].item()
    return conf >= IMPACT_CONF_THRESH, conf


def run_inference(video_path: str, output_path: str) -> dict | None:
    """
    Full inference pipeline: pose estimation → shot classification → scoring → annotated video.

    Returns a result dict matching the ShotAnalysisData shape expected by the frontend,
    or None if pose extraction fails.
    """
    cap          = cv2.VideoCapture(video_path)
    fps          = cap.get(cv2.CAP_PROP_FPS) or 30
    W            = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H            = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    roi          = get_roi(W, H)

    raw_kp_list       = []
    landmarks_list    = []
    valid_frame_map   = []
    impact_candidates = []

    print('Pass 1/2 — extracting keypoints + detecting impact frames...')
    valid_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        orig_frame_idx = len(landmarks_list)

        is_impact, imp_conf = predict_impact(frame)
        if is_impact:
            impact_candidates.append((valid_idx, imp_conf))

        results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if results.pose_landmarks:
            kp = []
            for lm in results.pose_landmarks.landmark:
                kp.extend([lm.x, lm.y, lm.z])
            raw_kp_list.append(kp)
            landmarks_list.append(results.pose_landmarks)
            valid_frame_map.append(orig_frame_idx)
            valid_idx += 1
        else:
            landmarks_list.append(None)

    cap.release()

    valid_kp = np.array(raw_kp_list)
    T_valid  = len(valid_kp)
    print(f'  Valid pose frames: {T_valid}  |  Impact candidates: {len(impact_candidates)}')

    if T_valid < 10:
        print('ERROR: not enough pose frames detected.')
        return None

    # Detect handedness and canonicalize to right-handed frame
    hand = detect_handedness(valid_kp)
    if hand == 'left':
        valid_kp = mirror_keypoints_flat(valid_kp)
    batting_hand = 'Right Handed' if hand == 'right' else 'Left Handed'

    # Pick impact frame
    impact_detected = bool(impact_candidates)
    if impact_detected:
        best_valid_idx, best_conf = max(impact_candidates, key=lambda x: x[1])
        raw_video_impact_frame    = valid_frame_map[best_valid_idx]
        print(f'  Impact @ valid_kp[{best_valid_idx}]  video_frame={raw_video_impact_frame}  conf={best_conf:.1%}')
    else:
        best_valid_idx         = _velocity_impact_fallback(valid_kp)
        raw_video_impact_frame = valid_frame_map[best_valid_idx]
        best_conf              = 0.0
        print(f'  No impact — velocity fallback @ valid_kp[{best_valid_idx}]')

    # Shot classification
    kp_sampled    = sample_frames(valid_kp)
    kp_norm       = normalize_pose(kp_sampled)
    valid_kp_norm = normalize_pose(valid_kp)
    features      = build_features(kp_norm)

    with torch.no_grad():
        logits = shot_model(torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(DEVICE))
        probs  = torch.softmax(logits, dim=1)[0]
        if _LABEL_OFFSET:
            probs = probs[_LABEL_OFFSET:]
        pred       = torch.argmax(probs).item()
        confidence = probs[pred].item()

    shot_name = LABEL_NAMES[pred] if confidence >= CONF_THRESHOLD else 'Not Identified'

    # Scoring
    if shot_name == 'Not Identified':
        sim, rule_score, rules = 0.0, 0.0, []
        final_score  = 0.0
        quality      = 'Incorrect'
        feedback     = ['[!] Shot could not be identified.']
        phase_scores = {p: 0.0 for p in PHASE_WEIGHTS}
        kp_err, kp_mismatch = 0.0, 0
    else:
        sim               = compute_pose_similarity(valid_kp_norm, best_valid_idx, pred)
        rule_score, rules = compute_rule_score(kp_norm, best_valid_idx, T_valid, shot_name)
        final_score       = 0.50 * sim + 0.50 * rule_score
        quality           = ('Correct'   if final_score > 0.75
                             else 'Average' if final_score > 0.60 else 'Incorrect')
        feedback          = generate_feedback(rules)
        phase_scores      = {}
        for phase in PHASE_WEIGHTS:
            seg_raw  = slice_phase_raw(valid_kp_norm, best_valid_idx, phase)
            seg_feat = build_features(seg_raw)
            ideals   = ideal_poses[pred][phase]
            seg_r    = resample_to(seg_feat, ideals.shape[1])
            phase_scores[phase] = best_of_k_sim(seg_r, ideals)
        kp_err, kp_mismatch = compute_keypoint_error(valid_kp_norm, best_valid_idx, pred)

    result = {
        'shot':              shot_name,
        'confidence':        float(confidence),
        'fps':               fps,
        'batting_hand':      batting_hand,
        'impact_detected':   impact_detected,
        'impact_frame':      raw_video_impact_frame,
        'impact_confidence': round(best_conf, 4),
        'keypoint_error':    kp_err,
        'keypoint_mismatch': kp_mismatch,
        'f1_score':          MODEL_F1_SCORES.get(shot_name),
        'pose': {
            'quality':      quality,
            'score':        round(float(final_score), 4),
            'rule_score':   round(float(rule_score), 4),
            'similarity':   round(float(sim), 4),
            'phase_scores': {k: round(v, 4) for k, v in phase_scores.items()},
        },
        'feedback': feedback,
    }
    print('\nPrediction:', result)

    print('Generating LLM coaching summary...')
    llm_summary = analyze_shot_with_llm(result)
    result['llm_summary'] = llm_summary
    print(f'LLM: {llm_summary[:80]}...')

    shot_color = LABEL_COLORS.get(shot_name, (180,180,180))
    lm_style   = mp_draw.DrawingSpec(color=(0,255,180), thickness=3, circle_radius=4)
    conn_style = mp_draw.DrawingSpec(color=shot_color, thickness=2)

    print('Pass 2/2 — writing annotated video...')
    cap = cv2.VideoCapture(video_path)
    # avc1 (H.264) is browser-playable; mp4v (MPEG-4 Part 2) is not
    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    out    = cv2.VideoWriter(output_path, fourcc, fps, (W, H))

    feedback_ph     = 18 + 22 * len(feedback)
    impact_panel_py = 252 + feedback_ph + 8

    for frame_idx in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break

        lm     = landmarks_list[frame_idx] if frame_idx < len(landmarks_list) else None
        in_roi = is_player_in_roi(lm, W, H, roi)

        draw_roi(frame, roi, in_roi, shot_color)
        if lm is not None:
            mp_draw.draw_landmarks(frame, lm, mp_pose.POSE_CONNECTIONS, lm_style, conn_style)

        draw_hud(frame, result, frame_idx, total_frames, in_roi,
                 raw_impact_frame=raw_video_impact_frame)
        draw_feedback_panel(frame, feedback, py=252)
        draw_impact_panel(frame, result, py=impact_panel_py)
        draw_llm_panel(frame, llm_summary)
        out.write(frame)

    cap.release()
    out.release()
    print(f'Saved -> {output_path}')
    return result
