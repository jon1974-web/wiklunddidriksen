import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
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
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Søk etter adresse...',
  onSelect,
}) => {
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const searchAddress = async (input: string) => {
    if (input.length < MIN_SEARCH_LENGTH) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&language=no&types=address`
      );
      const data = await response.json();
      if (data.predictions) {
        setPredictions(data.predictions);
        setShowResults(true);
      }
    } catch (error) {
      setPredictions([]);
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
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
      />
      
      {showResults && predictions.length > 0 && (
        <View style={[styles.resultsContainer, { backgroundColor: colors.surface }]}>
          {predictions.map((prediction) => (
            <TouchableOpacity
              key={prediction.place_id}
              style={[styles.resultItem, { borderBottomColor: colors.border }]}
              onPress={() => handleSelect(prediction)}
            >
              <Text style={[styles.resultText, { color: colors.text }]}>{prediction.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 1001,
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  resultText: {
    fontSize: 14,
  },
});
