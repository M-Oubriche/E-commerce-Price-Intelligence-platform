from abc import ABC, abstractmethod
from typing import Iterator

from .models import RawLandingRecord

class BaseScraper(ABC):
    """
    Abstract base class for all data source scrapers in the pipeline.
    Ensures that every scraper outputs validated data fitting the RawLandingRecord schema.
    """

    @abstractmethod
    def scrape(self, *args, **kwargs) -> Iterator[RawLandingRecord]:
        """
        Main scraping extraction logic to be implemented by child classes.
        Must yield Pydantic instances of `RawLandingRecord`.
        """
        pass
