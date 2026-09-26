"""Headless preview renderer for the included OpenSCAD STL."""
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.colors import to_rgb

root = Path(__file__).parent
vertices = [list(map(float, line.split()[1:])) for line in (root / "dispenser.stl").read_text().splitlines() if line.strip().startswith("vertex ")]
triangles = np.asarray(vertices, dtype=np.float32).reshape(-1, 3, 3)

fig = plt.figure(figsize=(9, 8), facecolor="#e8f0f2")
ax = fig.add_subplot(111, projection="3d", facecolor="#e8f0f2", proj_type="persp")
normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-8)
light = np.array([-.35, -.65, .8]); light /= np.linalg.norm(light)
brightness = .52 + .42 * np.clip(normals @ light, 0, 1)
base = np.array(to_rgb("#b9d1d6"))
colors = np.clip(base[None,:] * brightness[:,None], 0, 1)
mesh = Poly3DCollection(triangles, linewidths=0, edgecolors="none", alpha=1)
mesh.set_facecolor(colors)
ax.add_collection3d(mesh)
ax.set(xlim=(-85, 85), ylim=(-85, 85), zlim=(-110, 120))
ax.set_box_aspect((170, 170, 230), zoom=.82)
ax.view_init(elev=20, azim=-65)
ax.set_axis_off()
fig.subplots_adjust(0, 0, 1, 1)
fig.savefig(root / "dispenser.png", dpi=150, facecolor=fig.get_facecolor())
