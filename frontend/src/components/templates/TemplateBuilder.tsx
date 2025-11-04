import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type {
  CreateTemplatePayload,
  TemplateComponent,
  TemplateComponentType,
  TemplateCategory,
  TemplateLanguage,
} from '../../types/template';
import ComponentEditor from './ComponentEditor';
import {templateService} from '../../services/templateService';

interface TemplateBuilderProps {
  initialData?: Partial<CreateTemplatePayload>;
  onSave: (template: CreateTemplatePayload) => void;
  onCancel: () => void;
  onChange?: (template: CreateTemplatePayload) => void;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  onChange,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<TemplateCategory>(
    initialData?.category || 'UTILITY',
  );
  const [language, setLanguage] = useState<TemplateLanguage>(
    initialData?.language || 'en',
  );
  const [components, setComponents] = useState<TemplateComponent[]>(
    initialData?.components || [],
  );
  const [errors, setErrors] = useState<string[]>([]);

  // Sort components in the correct order: HEADER -> BODY -> FOOTER -> BUTTONS
  const sortComponents = (comps: TemplateComponent[]): TemplateComponent[] => {
    const order: TemplateComponentType[] = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
    return [...comps].sort((a, b) => {
      return order.indexOf(a.type) - order.indexOf(b.type);
    });
  };

  // Notify parent of changes for live preview
  const notifyChange = (updatedComponents: TemplateComponent[]) => {
    if (onChange && name) {
      const sortedComponents = sortComponents(updatedComponents);
      const template: CreateTemplatePayload = {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        category,
        language,
        components: sortedComponents,
      };
      onChange(template);
    }
  };

  const addComponent = (type: TemplateComponentType) => {
    // Check for duplicates (except BODY which can have multiple)
    if (type !== 'BODY' && components.some(c => c.type === type)) {
      Alert.alert(
        'Duplicate Component',
        `${type} component already exists. Only one ${type} component is allowed.`,
      );
      return;
    }

    const newComponent: TemplateComponent = {
      type,
      ...(type === 'HEADER' && {format: 'TEXT'}),
      ...(type !== 'BUTTONS' && {text: ''}),
      ...(type === 'BUTTONS' && {buttons: []}),
    };

    const updatedComponents = [...components, newComponent];
    setComponents(updatedComponents);
    notifyChange(updatedComponents);
  };

  const updateComponent = (index: number, component: TemplateComponent) => {
    const newComponents = [...components];
    newComponents[index] = component;
    setComponents(newComponents);
    notifyChange(newComponents);
  };

  const deleteComponent = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    setComponents(newComponents);
    notifyChange(newComponents);
  };

  const handleSave = () => {
    // Sort components in the correct order before saving
    const sortedComponents = sortComponents(components);
    
    const template: CreateTemplatePayload = {
      name: name.toLowerCase().replace(/\s+/g, '_'),
      category,
      language,
      components: sortedComponents,
    };

    const validation = templateService.validateTemplate(template);

    if (!validation.isValid) {
      setErrors(validation.errors);
      Alert.alert(
        'Validation Error',
        validation.errors.join('\n\n'),
        [{text: 'OK'}],
      );
      return;
    }

    setErrors([]);
    onSave(template);
  };

  const hasComponent = (type: TemplateComponentType) => {
    return components.some(c => c.type === type);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              notifyChange(components);
            }}
            placeholder="e.g., health_reminder"
            autoCapitalize="none"
          />
          <Text style={styles.helpText}>
            Use lowercase letters, numbers, and underscores only
          </Text>
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.optionButtons}>
            {(['UTILITY', 'MARKETING', 'AUTHENTICATION'] as TemplateCategory[]).map(
              cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.optionButton,
                    category === cat && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    notifyChange(components);
                  }}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      category === cat && styles.optionButtonTextActive,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.optionButtons}>
            {([
              {code: 'en', label: 'English'},
              {code: 'en_US', label: 'English (US)'},
              {code: 'hi', label: 'Hindi'},
              {code: 'es', label: 'Spanish'},
              {code: 'fr', label: 'French'},
              {code: 'pt_BR', label: 'Portuguese (BR)'},
            ] as Array<{code: TemplateLanguage; label: string}>).map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionButton,
                  language === lang.code && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  notifyChange(components);
                }}>
                <Text
                  style={[
                    styles.optionButtonText,
                    language === lang.code && styles.optionButtonTextActive,
                  ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Components</Text>
          <Text style={styles.helpText}>
            💡 Add components in any order. They will be automatically sorted: Header → Body → Footer → Buttons
          </Text>

          {components.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No components added yet. Add components to build your template.
              </Text>
            </View>
          )}

          {components.map((component, index) => (
            <ComponentEditor
              key={index}
              component={component}
              onChange={comp => updateComponent(index, comp)}
              onDelete={() => deleteComponent(index)}
            />
          ))}

          {}
          <View style={styles.addComponentSection}>
            <Text style={styles.addComponentTitle}>Add Component:</Text>
            <View style={styles.addComponentButtons}>
              <TouchableOpacity
                style={[
                  styles.addComponentButton,
                  hasComponent('HEADER') && styles.addComponentButtonDisabled,
                ]}
                onPress={() => addComponent('HEADER')}
                disabled={hasComponent('HEADER')}>
                <Text style={styles.addComponentButtonText}>+ Header</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addComponentButton}
                onPress={() => addComponent('BODY')}>
                <Text style={styles.addComponentButtonText}>+ Body</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addComponentButton,
                  hasComponent('FOOTER') && styles.addComponentButtonDisabled,
                ]}
                onPress={() => addComponent('FOOTER')}
                disabled={hasComponent('FOOTER')}>
                <Text style={styles.addComponentButtonText}>+ Footer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addComponentButton,
                  hasComponent('BUTTONS') && styles.addComponentButtonDisabled,
                ]}
                onPress={() => addComponent('BUTTONS')}
                disabled={hasComponent('BUTTONS')}>
                <Text style={styles.addComponentButtonText}>+ Buttons</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {}
        {errors.length > 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Validation Errors:</Text>
            {errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Template</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
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
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  optionButtonTextActive: {
    color: '#1E40AF',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  addComponentSection: {
    marginTop: 16,
  },
  addComponentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  addComponentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addComponentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    marginRight: 8,
    marginBottom: 8,
  },
  addComponentButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  addComponentButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TemplateBuilder;
