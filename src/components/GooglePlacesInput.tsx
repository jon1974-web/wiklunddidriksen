import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { GOOGLE_MAPS_API_KEY } from '../constants/api';
import { DEBOUNCE_MS, MIN_SEARCH_LENGTH } from '../constants/limits';

interface Place {
  description: string;
  place_id: string;
}

interface GooglePlacesInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSelect: (address: string) => void;
  types?: string[];
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Søk etter adresse...',
  onSelect,
  types = ['address'],
}) => {
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<any>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        autocompleteRef.current = new (window as any).google.maps.places.AutocompleteService();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=no`;
      script.async = true;
      script.onload = () => {
        autocompleteRef.current = new (window as any).google.maps.places.AutocompleteService();
      };
      document.head.appendChild(script);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const searchAddress = (input: string) => {
    if (input.length < MIN_SEARCH_LENGTH || !autocompleteRef.current) {
      setPredictions([]);
      setShowResults(false);
      return;
    }

    if (Platform.OS === 'web') {
      const google = (window as any).google;
      autocompleteRef.current.getQueryPredictions(
        { input, types, componentRestrictions: { country: 'no' } },
        (results: any[] | null, status: string) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(
              results.map((r: any) => ({
                description: r.description || '',
                place_id: r.place_id || '',
              }))
            );
            setShowResults(true);
          } else {
            setPredictions([]);
            setShowResults(false);
          }
        }
      );
    } else {
      fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&language=no&types=${types.join('|')}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.predictions) {
            setPredictions(data.predictions);
            setShowResults(true);
          }
        })
        .catch(() => setPredictions([]));
    }
  };

  const handleChange = (text: string) => {
    onChangeText(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(text);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (prediction: Place) => {
    onSelect(prediction.description);
    setPredictions([]);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
      />

      {showResults && predictions.length > 0 && (
        <View style={[styles.resultsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {predictions.map((prediction) => (
            <TouchableOpacity
              key={prediction.place_id}
              style={[styles.resultItem, { borderBottomColor: colors.border }]}
              onPress={() => handleSelect(prediction)}
              activeOpacity={0.7}
            >
              <Text style={[styles.resultIcon, { color: colors.textDisabled }]}>📍</Text>
              <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                {prediction.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  resultsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultIcon: {
    fontSize: 14,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
});
