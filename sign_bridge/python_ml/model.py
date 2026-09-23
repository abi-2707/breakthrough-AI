"""
Sign Language Temporal Sequence Classifier Architecture
PyTorch GRU / Temporal 1D-CNN model designed for sequence classification of 
hand landmark frames (e.g. 30 frames x 126 coordinates).
"""

import torch
import torch.nn as nn

class SignLanguageGRU(nn.Module):
    """
    Lightweight bidirectional GRU with attention/pooling over time.
    Inputs: (Batch, Sequence_Length, 126)
    Outputs: (Batch, Num_Classes)
    """
    def __init__(self, input_dim=126, hidden_dim=64, num_layers=2, num_classes=10, dropout=0.3):
        super(SignLanguageGRU, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Feature projection layer
        self.fc_in = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # Bidirectional GRU
        self.gru = nn.GRU(
            input_size=64,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Classification Head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        # x: (B, T, 126)
        B, T, F = x.size()
        
        # Reshape to project per-frame features
        x_reshaped = x.view(B * T, F)
        proj = self.fc_in(x_reshaped)
        proj = proj.view(B, T, -1) # (B, T, 64)
        
        # Pass through GRU
        gru_out, _ = self.gru(proj) # (B, T, hidden_dim * 2)
        
        # Global max pooling across time dimension for temporal invariance
        pooled, _ = torch.max(gru_out, dim=1) # (B, hidden_dim * 2)
        
        logits = self.classifier(pooled) # (B, num_classes)
        return logits

class TemporalCNN(nn.Module):
    """
    Alternative 1D Temporal CNN for ultra-low latency inference on edge devices.
    """
    def __init__(self, input_dim=126, num_classes=10):
        super(TemporalCNN, self).__init__()
        self.conv_net = nn.Sequential(
            nn.Conv1d(input_dim, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(2),
            
            nn.Conv1d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1)
        )
        self.fc = nn.Linear(128, num_classes)

    def forward(self, x):
        # x is (B, T, 126) -> transpose to (B, 126, T) for Conv1D
        x = x.transpose(1, 2)
        feat = self.conv_net(x).squeeze(-1)
        return self.fc(feat)
