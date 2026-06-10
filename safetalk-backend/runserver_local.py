import runpy
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
SITE_PACKAGES = BASE_DIR / "venv" / "Lib" / "site-packages"

if SITE_PACKAGES.exists():
    sys.path.insert(0, str(SITE_PACKAGES))

sys.argv = ["manage.py", "runserver", "127.0.0.1:8000", "--noreload"]
runpy.run_path(str(BASE_DIR / "manage.py"), run_name="__main__")
