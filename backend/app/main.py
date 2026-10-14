import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.database.session import engine, Base, SessionLocal
from backend.app.api.endpoints import router as api_router
from backend.app.models.models import DatasetSample, HumanAnnotation
from backend.app.utils.sample_generator import create_sample_preset_data

# Create tables
Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed presets and initial dataset samples if empty
    startup_seed_data()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Counterpoint AI — Speech Analytics & Temporal Flaw Finding API",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router, prefix="/api")

def startup_seed_data():
    """Seeds presets and initial dataset samples/annotations on startup if empty."""
    db = SessionLocal()
    try:
        # Check if samples exist
        existing_samples = db.query(DatasetSample).count()
        if existing_samples == 0:
            presets = create_sample_preset_data(settings.SAMPLES_STORAGE_DIR)

            # Sample 1: Hamlet
            sample_1 = DatasetSample(
                sample_id="sample_hamlet_01",
                script_id="script_hamlet_soliloquy",
                title="Hamlet - To be or not to be (Flawed Delivery)",
                speech_category="Interpretive Reading",
                speaker_id="contestant_101",
                role="participant",
                audio_path=presets["script_1"]["participant_audio"],
                transcript_text=presets["script_1"]["transcript"],
                flaw_categories_json=json.dumps(["excessive_speaking_rate", "excessive_pause", "flat_intonation", "inconsistent_loudness"]),
                severity="medium",
                is_synthetic=True,
                perturbation_type="mixed_delivery_flaws",
                split="test",
                notes="Ground-truth test recording with rushed opening phrase and trailing volume."
            )
            db.add(sample_1)
            db.flush()

            # Human annotations for Sample 1
            annos_1 = [
                HumanAnnotation(
                    dataset_sample_id=sample_1.id,
                    reviewer_id="lead_speech_judge",
                    flaw_category="excessive_speaking_rate",
                    start_seconds=0.0,
                    end_seconds=1.2,
                    text_segment="To be, or not to be",
                    severity="high",
                    explanation="Speaker rushed through the opening iconic phrase without letting the paradox land."
                ),
                HumanAnnotation(
                    dataset_sample_id=sample_1.id,
                    reviewer_id="lead_speech_judge",
                    flaw_category="excessive_pause",
                    start_seconds=3.2,
                    end_seconds=5.2,
                    text_segment="that is the question: [PAUSE]",
                    severity="high",
                    explanation="Unusually long silence created an awkward break in dramatic momentum."
                ),
                HumanAnnotation(
                    dataset_sample_id=sample_1.id,
                    reviewer_id="lead_speech_judge",
                    flaw_category="flat_intonation",
                    start_seconds=5.2,
                    end_seconds=7.8,
                    text_segment="Whether 'tis nobler in the mind to suffer",
                    severity="medium",
                    explanation="Pitch stayed completely flat across the second line with no emphasis on 'nobler'."
                ),
                HumanAnnotation(
                    dataset_sample_id=sample_1.id,
                    reviewer_id="lead_speech_judge",
                    flaw_category="inconsistent_loudness",
                    start_seconds=10.5,
                    end_seconds=13.0,
                    text_segment="Or to take arms against a sea of troubles.",
                    severity="medium",
                    explanation="Speaker trailed off and final words were barely audible."
                )
            ]
            for a in annos_1:
                db.add(a)

            # Sample 2: Persuasive Oratory
            sample_2 = DatasetSample(
                sample_id="sample_oratory_02",
                script_id="script_technological_crossroads",
                title="The Great Technological Crossroads (Participant Delivery)",
                speech_category="Persuasive Oratory",
                speaker_id="contestant_102",
                role="participant",
                audio_path=presets["script_2"]["participant_audio"],
                transcript_text=presets["script_2"]["transcript"],
                flaw_categories_json=json.dumps(["excessive_speaking_rate", "flat_intonation", "excessive_pause"]),
                severity="medium",
                is_synthetic=True,
                perturbation_type="mixed_delivery_flaws",
                split="val",
                notes="Persuasive speech test sample with rapid tempo on thesis assertion."
            )
            db.add(sample_2)
            db.flush()

            annos_2 = [
                HumanAnnotation(
                    dataset_sample_id=sample_2.id,
                    reviewer_id="oratory_evaluator_2",
                    flaw_category="excessive_speaking_rate",
                    start_seconds=0.0,
                    end_seconds=1.8,
                    text_segment="We stand today at a profound technological crossroads.",
                    severity="medium",
                    explanation="Rapid delivery weakens the gravity of the opening thesis."
                ),
                HumanAnnotation(
                    dataset_sample_id=sample_2.id,
                    reviewer_id="oratory_evaluator_2",
                    flaw_category="excessive_pause",
                    start_seconds=4.8,
                    end_seconds=6.8,
                    text_segment="democracy, [PAUSE] and our responsibility",
                    severity="high",
                    explanation="Noticeable pause between clause and conjunction."
                )
            ]
            for a in annos_2:
                db.add(a)

            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)
