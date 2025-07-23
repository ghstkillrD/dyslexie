import torch
import torch.nn as nn

class DyslexiaCNN(nn.Module):
    def __init__(self):
        super(DyslexiaCNN, self).__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 7 * 7, 128),
            nn.ReLU(),
            nn.Linear(128, 3)
        )

    def forward(self, x):
        return self.fc(self.conv(x))


def load_model(path="models/dyslexia_cnn_english.pth"):
    model = DyslexiaCNN()
    model.load_state_dict(torch.load(path, map_location="cpu"))
    model.eval()
    return model
