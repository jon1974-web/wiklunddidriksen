declare namespace google {
  namespace maps {
    namespace places {
      class AutocompleteService {
        constructor();
        getQueryPredictions(
          request: {
            input: string;
            types?: string[];
            componentRestrictions?: { country: string };
          },
          callback: (results: AutocompletePrediction[] | null, status: string) => void
        ): void;
      }

      interface AutocompletePrediction {
        description?: string;
        place_id?: string;
      }

      namespace PlacesServiceStatus {
        const OK: string;
      }
    }
  }
}
