import React from 'react';
import {View, Text, StyleSheet, Image, ScrollView} from 'react-native';
import type {Template, TemplateComponent} from '../../types/template';

interface TemplatePreviewProps {
  template: Template;
  sampleData?: Record<string, string>;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  sampleData = {},
}) => {
  // Replace placeholders with sample data
  const replacePlaceholders = (text: string, examples?: string[][]): string => {
    if (!text) return '';
    
    let result = text;
    
    // Replace {{1}}, {{2}}, etc. with sample data or examples
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (matches) {
      matches.forEach((match, index) => {
        const num = match.replace(/\{\{|\}\}/g, '');
        let replacement = '';
        
        // Try to get from examples first
        if (examples && examples[0] && examples[0][index]) {
          replacement = examples[0][index];
        }
        // Otherwise use sample data
        else if (sampleData[num]) {
          replacement = sampleData[num];
        }
        // Default placeholder
        else {
          replacement = `[Value ${num}]`;
        }
        
        result = result.replace(match, replacement);
      });
    }
    
    return result;
  };

  const renderComponent = (component: TemplateComponent, index: number) => {
    switch (component.type) {
      case 'HEADER':
        return renderHeader(component, index);
      case 'BODY':
        return renderBody(component, index);
      case 'FOOTER':
        return renderFooter(component, index);
      case 'BUTTONS':
        return renderButtons(component, index);
      default:
        return null;
    }
  };

  const renderHeader = (component: TemplateComponent, index: number) => {
    if (component.format === 'TEXT' && component.text) {
      return (
        <View key={index} style={styles.headerContainer}>
          <Text style={styles.headerText}>
            {replacePlaceholders(component.text, component.example?.body_text)}
          </Text>
        </View>
      );
    }

    if (component.format === 'IMAGE') {
      return (
        <View key={index} style={styles.headerContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷 Image Header</Text>
            {component.example?.header_handle?.[0] && (
              <Text style={styles.imageUrl} numberOfLines={1}>
                {component.example.header_handle[0]}
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (component.format === 'VIDEO') {
      return (
        <View key={index} style={styles.headerContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🎥 Video Header</Text>
          </View>
        </View>
      );
    }

    if (component.format === 'DOCUMENT') {
      return (
        <View key={index} style={styles.headerContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📄 Document Header</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderBody = (component: TemplateComponent, index: number) => {
    if (!component.text) return null;

    return (
      <View key={index} style={styles.bodyContainer}>
        <Text style={styles.bodyText}>
          {replacePlaceholders(component.text, component.example?.body_text)}
        </Text>
      </View>
    );
  };

  const renderFooter = (component: TemplateComponent, index: number) => {
    if (!component.text) return null;

    return (
      <View key={index} style={styles.footerContainer}>
        <Text style={styles.footerText}>{component.text}</Text>
      </View>
    );
  };

  const renderButtons = (component: TemplateComponent, index: number) => {
    if (!component.buttons || component.buttons.length === 0) return null;

    return (
      <View key={index} style={styles.buttonsContainer}>
        {component.buttons.map((button, btnIndex) => (
          <View key={btnIndex} style={styles.button}>
            <Text style={styles.buttonText}>
              {button.type === 'PHONE_NUMBER' && '📞 '}
              {button.type === 'URL' && '🔗 '}
              {button.text}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.phoneFrame}>
        <View style={styles.phoneHeader}>
          <Text style={styles.phoneHeaderText}>WhatsApp Preview</Text>
        </View>

        <View style={styles.messageContainer}>
          <View style={styles.messageBubble}>
            {template.components.map((component, index) =>
              renderComponent(component, index),
            )}

            <View style={styles.messageInfo}>
              <Text style={styles.timestamp}>
                {new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>Template: </Text>
            {template.name}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>Category: </Text>
            {template.category}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>Language: </Text>
            {template.language}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>Status: </Text>
            {template.status}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  phoneFrame: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneHeader: {
    backgroundColor: '#075E54',
    padding: 16,
    alignItems: 'center',
  },
  phoneHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    padding: 16,
    backgroundColor: '#ECE5DD',
    minHeight: 200,
  },
  messageBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 0,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    padding: 12,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    backgroundColor: '#E5E7EB',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 24,
    color: '#6B7280',
    marginBottom: 8,
  },
  imageUrl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  bodyContainer: {
    padding: 12,
  },
  bodyText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  footerContainer: {
    padding: 12,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 15,
    color: '#0891B2',
    fontWeight: '600',
  },
  messageInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  metaInfo: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  metaLabel: {
    fontWeight: '600',
    color: '#374151',
  },
});

export default TemplatePreview;
