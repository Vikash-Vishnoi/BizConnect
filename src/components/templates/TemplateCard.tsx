import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {Template} from '../../types/template';
import TemplateStatusBadge from './TemplateStatusBadge';

interface TemplateCardProps {
  template: Template;
  onPress: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({template, onPress}) => {
  // Get component counts
  const componentCounts = {
    header: template.components.filter(c => c.type === 'HEADER').length > 0,
    body: template.components.filter(c => c.type === 'BODY').length > 0,
    footer: template.components.filter(c => c.type === 'FOOTER').length > 0,
    buttons: template.components.filter(c => c.type === 'BUTTONS').length > 0,
  };

  // Get body text preview
  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const bodyPreview = bodyComponent?.text?.substring(0, 80) || '';

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(template)}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{template.name}</Text>
          <Text style={styles.category}>{template.category}</Text>
        </View>
        <TemplateStatusBadge status={template.status} />
      </View>

      {bodyPreview && (
        <Text style={styles.preview} numberOfLines={2}>
          {bodyPreview}
          {bodyComponent?.text && bodyComponent.text.length > 80 ? '...' : ''}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.components}>
          {componentCounts.header && (
            <View style={styles.componentTag}>
              <Text style={styles.componentText}>📄 Header</Text>
            </View>
          )}
          {componentCounts.body && (
            <View style={styles.componentTag}>
              <Text style={styles.componentText}>📝 Body</Text>
            </View>
          )}
          {componentCounts.footer && (
            <View style={styles.componentTag}>
              <Text style={styles.componentText}>👣 Footer</Text>
            </View>
          )}
          {componentCounts.buttons && (
            <View style={styles.componentTag}>
              <Text style={styles.componentText}>🔘 Buttons</Text>
            </View>
          )}
        </View>

        {template.updatedAt && (
          <Text style={styles.date}>{formatDate(template.updatedAt)}</Text>
        )}
      </View>

      {template.status === 'rejected' && template.rejectionReason && (
        <View style={styles.rejectionBanner}>
          <Text style={styles.rejectionText} numberOfLines={2}>
            ❌ {template.rejectionReason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  components: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 12,
  },
  componentTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  componentText: {
    fontSize: 11,
    color: '#6B7280',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rejectionBanner: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  rejectionText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
});

export default TemplateCard;
