from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOGBOOK_")

    data_dir: Path = Path("data")
    db_path: Path | None = None
    tile_url_light: str = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    tile_url_dark: str = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    refresh_interval_days: int = 7
    # Slim enroute-fix CSV published by CI (GitHub release asset). Empty → use
    # the bundled snapshot only. e.g. https://github.com/<you>/logbook/releases/latest/download/fixes.csv
    fixes_url: str = ""
    bundled_datasets_dir: Path = Path(__file__).parent.parent / "datasets" / "bundled"

    @property
    def database_url(self) -> str:
        path = self.db_path or (self.data_dir / "logbook.db")
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{path}"


settings = Settings()
