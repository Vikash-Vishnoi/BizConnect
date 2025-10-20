import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type {
  TemplateComponent,
  TemplateComponentType,
  TemplateHeaderFormat,
  TemplateButton,
  TemplateButtonType,
} from '../../types/template';

interface ComponentEditorProps {
  component: TemplateComponent;
  onChange: (component: TemplateComponent) => void;
  onDelete: () => void;
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
  onChange,
  onDelete,
}) => {
  const [showExamples, setShowExamples] = useState(false);

  const updateComponent = (updates: Partial<TemplateComponent>) => {
    onChange({...component, ...updates});
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const newButtons = [...(component.buttons || [])];
    newButtons[index] = {...newButtons[index], ...updates};
    updateComponent({buttons: newButtons});
  };

  const addButton = () => {
    const newButtons = [
      ...(component.buttons || []),
      {type: 'QUICK_REPLY' as TemplateButtonType, text: ''},
    ];
    updateComponent({buttons: newButtons});
  };

  const removeButton = (index: number) => {
    const newButtons = [...(component.buttons || [])];
    newButtons.splice(index, 1);
    updateComponent({buttons: newButtons});
  };

  const renderHeaderEditor = () => {
    return (
      <View>
        <Text style={styles.label}>Header Format</Text>
        <View style={styles.formatButtons}>
          {(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as TemplateHeaderFormat[]).map(
            format => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.formatButton,
                  component.format === format && styles.formatButtonActive,
                ]}
                onPress={() => updateComponent({format})}>
                <Text
                  style={[
                    styles.formatButtonText,
                    component.format === format &&
                      styles.formatButtonTextActive,
                  ]}>
                  {format}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        {component.format === 'TEXT' && (
          <View>
            <Text style={styles.label}>Header Text (max 60 chars)</Text>
            <TextInput
              style={styles.input}
              value={component.text || ''}
              onChangeText={text => updateComponent({text})}
              placeholder="Enter header text"
              maxLength={60}
            />
            <Text style={styles.charCount}>
              {(component.text || '').length}/60
            </Text>
          </View>
        )}

        {(component.format === 'IMAGE' ||
          component.format === 'VIDEO' ||
          component.format === 'DOCUMENT') && (
          <View>
            <Text style={styles.helpText}>
              {component.format === 'IMAGE' &&
                'Upload an image when creating the campaign'}
              {component.format === 'VIDEO' &&
                'Upload a video when creating the campaign'}
              {component.format === 'DOCUMENT' &&
                'Upload a document when creating the campaign'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBodyEditor = () => {
    return (
      <View>
        <Text style={styles.label}>Body Text (max 1024 chars)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={component.text || ''}
          onChangeText={text => updateComponent({text})}
          placeholder="Enter body text. Use {{1}}, {{2}} for variables"
          multiline
          numberOfLines={6}
          maxLength={1024}
        />
        <Text style={styles.charCount}>
          {(component.text || '').length}/1024
        </Text>
        <Text style={styles.helpText}>
          Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic variables
        </Text>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setShowExamples(!showExamples)}>
          <Text style={styles.linkButtonText}>
            {showExamples ? '▼' : '▶'} Add Example Values
          </Text>
        </TouchableOpacity>

        {showExamples && (
          <View style={styles.examplesContainer}>
            <Text style={styles.label}>Example Values (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="John, Dec 25, 2024"
              onChangeText={text => {
                const values = text.split(',').map(v => v.trim());
                updateComponent({
                  example: {
                    ...component.example,
                    body_text: [values],
                  },
                });
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const renderFooterEditor = () => {
    return (
      <View>
        <Text style={styles.label}>Footer Text (max 60 chars)</Text>
        <TextInput
          style={styles.input}
          value={component.text || ''}
          onChangeText={text => updateComponent({text})}
          placeholder="Enter footer text"
          maxLength={60}
        />
        <Text style={styles.charCount}>{(component.text || '').length}/60</Text>
      </View>
    );
  };

  const renderButtonsEditor = () => {
    return (
      <View>
        <Text style={styles.label}>Buttons (max 3)</Text>
        {(component.buttons || []).map((button, index) => (
          <View key={index} style={styles.buttonEditor}>
            <View style={styles.buttonHeader}>
              <Text style={styles.buttonTitle}>Button {index + 1}</Text>
              <TouchableOpacity onPress={() => removeButton(index)}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Button Type</Text>
            <View style={styles.formatButtons}>
              {(['QUICK_REPLY', 'PHONE_NUMBER', 'URL'] as TemplateButtonType[]).map(
                type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.formatButton,
                      button.type === type && styles.formatButtonActive,
                    ]}
                    onPress={() => updateButton(index, {type})}>
                    <Text
                      style={[
                        styles.formatButtonText,
                        button.type === type && styles.formatButtonTextActive,
                      ]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <Text style={styles.label}>Button Text (max 20 chars)</Text>
            <TextInput
              style={styles.input}
              value={button.text}
              onChangeText={text => updateButton(index, {text})}
              placeholder="Button text"
              maxLength={20}
            />

            {button.type === 'PHONE_NUMBER' && (
              <View>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={button.phoneNumber || ''}
                  onChangeText={phoneNumber =>
                    updateButton(index, {phoneNumber})
                  }
                  placeholder="+1234567890"
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {button.type === 'URL' && (
              <View>
                <Text style={styles.label}>URL</Text>
                <TextInput
                  style={styles.input}
                  value={button.url || ''}
                  onChangeText={url => updateButton(index, {url})}
                  placeholder="https://example.com"
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>
        ))}

        {(!component.buttons || component.buttons.length < 3) && (
          <TouchableOpacity style={styles.addButton} onPress={addButton}>
            <Text style={styles.addButtonText}>+ Add Button</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{component.type} Component</Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>

      {component.type === 'HEADER' && renderHeaderEditor()}
      {component.type === 'BODY' && renderBodyEditor()}
      {component.type === 'FOOTER' && renderFooterEditor()}
      {component.type === 'BUTTONS' && renderButtonsEditor()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  formatButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  formatButtonActive: {
    backgroundColor: '#3B82F6',
  },
  formatButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  linkButton: {
    marginTop: 12,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  examplesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  buttonEditor: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default ComponentEditor;
