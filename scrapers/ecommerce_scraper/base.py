import os
import requests
from abc import ABC, abstractmethod
from typing import Iterator

from .models import RawLandingRecord

class BaseScraper(ABC):
    """
    Abstract base class for all data source scrapers in the pipeline.
    Ensures that every scraper outputs validated data fitting the RawLandingRecord schema.
    """

    _conversion_rates = {}

    def get_conversion_rate(self, from_currency: str, to_currency: str = "USD") -> float:
        """
        Fetches the latest conversion rate from an external API and caches it.
        Uses environment variables EXCHANGE_RATE_API_KEY and EXCHANGE_RATE_API_URL.
        """
        if from_currency == to_currency:
            return 1.0
            
        cache_key = f"{from_currency}_{to_currency}"
        if cache_key in self.__class__._conversion_rates:
            return self.__class__._conversion_rates[cache_key]
            
        api_key = os.getenv("EXCHANGE_RATE_API_KEY")
        api_url = os.getenv("EXCHANGE_RATE_API_URL", "https://v6.exchangerate-api.com/v6")
        
        if not api_key:
            print(f"Warning: EXCHANGE_RATE_API_KEY not set. Using fallback for {cache_key}.")
            fallbacks = {"EUR_USD": 1.08, "MAD_USD": 0.10}
            return fallbacks.get(cache_key, 1.0)
            
        try:
            url = f"{api_url}/{api_key}/pair/{from_currency}/{to_currency}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "conversion_rate" in data:
                    rate = float(data["conversion_rate"])
                    self.__class__._conversion_rates[cache_key] = rate
                    return rate
            else:
                print(f"Failed to fetch conversion rate {cache_key}. API returned {response.status_code}.")
        except Exception as e:
            print(f"Error fetching conversion rate {cache_key}: {e}")
            
        # Fallback values if request fails
        fallbacks = {"EUR_USD": 1.08, "MAD_USD": 0.10}
        return fallbacks.get(cache_key, 1.0)

    @abstractmethod
    def scrape(self, *args, **kwargs) -> Iterator[RawLandingRecord]:
        """
        Main scraping extraction logic to be implemented by child classes.
        Must yield Pydantic instances of `RawLandingRecord`.
        """
        pass
