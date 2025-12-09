import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {Template} from '../../types/template';
import TemplateStatusBadge from './TemplateStatusBadge';
import theme from '../../theme';

interface TemplateCardProps {
  template: Template;
  onPress: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({template, onPress}) => {
  const components = template.components || [];

  const componentCounts = {
    header: components.filter(c => c.type === 'HEADER').length > 0,
    body: components.filter(c => c.type === 'BODY').length > 0,
    footer: components.filter(c => c.type === 'FOOTER').length > 0,
    buttons: components.filter(c => c.type === 'BUTTONS').length > 0,
  };

  const bodyComponent = components.find(c => c.type === 'BODY');
  const bodyPreview = bodyComponent?.text?.substring(0, 80) || '';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(template)}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{template.name || 'Untitled Template'}</Text>
          <View style={styles.categoryRow}>
            <Text style={styles.tagIcon}>🏷️</Text>
            <Text style={styles.category}>{template.category || 'UNKNOWN'}</Text>
          </View>
        </View>
        <TemplateStatusBadge status={template.status} />
      </View>

      {bodyPreview && (
        <Text style={styles.preview} numberOfLines={2}>
          {bodyPreview}
          {bodyComponent?.text && bodyComponent.text.length > 80 ? '...' : ''}
        </Text>
      )}

      <View style={styles.componentsSection}>
        <View style={styles.componentsGrid}>
          {componentCounts.header && (
            <View style={styles.componentItem}>
              <View style={[styles.componentIcon, {backgroundColor: theme.colors.infoLight}]}>
                <Text style={[styles.componentEmoji, {color: theme.colors.info}]}>📄</Text>
              </View>
              <Text style={styles.componentLabel}>Header</Text>
            </View>
          )}
          {componentCounts.body && (
            <View style={styles.componentItem}>
              <View style={[styles.componentIcon, {backgroundColor: theme.colors.successLight}]}>
                <Text style={[styles.componentEmoji, {color: theme.colors.success}]}>📝</Text>
              </View>
              <Text style={styles.componentLabel}>Body</Text>
            </View>
          )}
          {componentCounts.footer && (
            <View style={styles.componentItem}>
              <View style={[styles.componentIcon, {backgroundColor: theme.colors.warningLight}]}>
                <Text style={[styles.componentEmoji, {color: theme.colors.warning}]}>━</Text>
              </View>
              <Text style={styles.componentLabel}>Footer</Text>
            </View>
          )}
          {componentCounts.buttons && (
            <View style={styles.componentItem}>
              <View style={[styles.componentIcon, {backgroundColor: theme.colors.primaryDark + '20'}]}>
                <Text style={[styles.componentEmoji, {color: theme.colors.primary}]}>▢</Text>
              </View>
              <Text style={styles.componentLabel}>Buttons</Text>
            </View>
          )}
        </View>
      </View>

      {template.updatedAt && (
        <View style={styles.footer}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={styles.date}>{formatDate(template.updatedAt)}</Text>
        </View>
      )}

      {template.status === 'rejected' && template.rejectionReason && (
        <View style={styles.rejectionBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.rejectionText} numberOfLines={2}>
            {template.rejectionReason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  name: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  componentsSection: {
    marginBottom: theme.spacing.sm,
  },
  componentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  componentIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
  },
  componentEmoji: {
    fontSize: 14,
  },
  componentLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  clockIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rejectionBanner: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  rejectionText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    lineHeight: 16,
    flex: 1,
  },
});

export default TemplateCard;
