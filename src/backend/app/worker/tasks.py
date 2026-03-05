from celery import Celery
from app.config import settings

# Initialize Celery with Redis as the message broker
celery_app = Celery(
    "echofeed",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,           # Only ack after task completes (safer)
    worker_prefetch_multiplier=1,  # One job at a time per worker
    task_max_retries=3,
    task_default_retry_delay=60,   # Retry after 60 seconds on failure
)


@celery_app.task(bind=True, name="process_video")
def process_video_task(self, video_id: str, url: str, user_id: str):
    """
    Celery task wrapper around the video processing pipeline.
    `bind=True` gives access to `self` for retries.
    """
    from app.services.video_processor import process_video
    try:
        result = process_video(video_id, url, user_id)
        return result
    except Exception as exc:
        # Retry up to 3 times with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)