import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export type DateRangePreset = 'today' | '7days' | '30days' | '90days' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSelectorProps {
  selectedRange: DateRangePreset;
  onRangeChange: (range: DateRangePreset, dates: DateRange) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getDateRange = (preset: DateRangePreset): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case '7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 6);
        return {
          startDate: week.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case '30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 29);
        return {
          startDate: month.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case '90days':
        const quarter = new Date(today);
        quarter.setDate(quarter.getDate() - 89);
        return {
          startDate: quarter.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      default:
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
    }
  };

  const getRangeLabel = (preset: DateRangePreset): string => {
    switch (preset) {
      case 'today':
        return 'Today';
      case '7days':
        return 'Last 7 Days';
      case '30days':
        return 'Last 30 Days';
      case '90days':
        return 'Last 90 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Select Range';
    }
  };

  const presets: DateRangePreset[] = ['today', '7days', '30days', '90days'];

  const handleRangeSelect = (preset: DateRangePreset) => {
    const dateRange = getDateRange(preset);
    onRangeChange(preset, dateRange);
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsModalVisible(true)}>
        <Icon name="calendar" size={20} color="#6B7280" />
        <Text style={styles.selectorText}>{getRangeLabel(selectedRange)}</Text>
        <Icon name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetList}>
              {presets.map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetItem,
                    selectedRange === preset && styles.presetItemSelected,
                  ]}
                  onPress={() => handleRangeSelect(preset)}>
                  <Text
                    style={[
                      styles.presetText,
                      selectedRange === preset && styles.presetTextSelected,
                    ]}>
                    {getRangeLabel(preset)}
                  </Text>
                  {selectedRange === preset && (
                    <Icon name="check" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  presetList: {
    padding: 8,
  },
  presetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  presetItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  presetText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  presetTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  closeText: {
    fontSize: 28,
    color: '#6B7280',
    lineHeight: 28,
  },
});

export default DateRangeSelector;
