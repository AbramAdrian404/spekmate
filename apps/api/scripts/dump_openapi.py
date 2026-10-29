"""Write the API's OpenAPI document to a file (default: ../web/openapi.json).

The frontend turns it into TypeScript types:  cd apps/web && npm run gen:types
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from laptop_advisor.config import load_settings  # noqa: E402
from laptop_advisor.main import create_app  # noqa: E402

# The document is the same whichever data source is used. An empty DATABASE_URL avoids creating a local database here.
app = create_app(load_settings({"DATABASE_URL": ""}))
target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "web" / "openapi.json"
target.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"OpenAPI written to {target}")
