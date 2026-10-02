// src/components/ObjectCard.tsx

import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  ObjectAnalysis,
} from '@/services/scannerApi';


// ============================================================
// PROPS
// ============================================================

type ObjectCardProps = {
  object: ObjectAnalysis;
};


// ============================================================
// OBJECT CARD
// ============================================================

export default function ObjectCard({
  object,
}: ObjectCardProps) {

  // ----------------------------------------------------------
  // CONFIDENCE
  // ----------------------------------------------------------

  const confidence =
    Number(object.confidence);

  const confidencePercent =
    Math.round(
      Math.max(
        0,
        Math.min(
          1,
          Number.isFinite(confidence)
            ? confidence
            : 0
        )
      ) * 100
    );


  // ----------------------------------------------------------
  // FEATURES
  // ----------------------------------------------------------

  const features: string[] =
    Array.isArray(object.features)
      ? object.features.filter(
          (
            feature
          ): feature is string =>
            typeof feature === 'string' &&
            feature.trim().length > 0
        )
      : [];


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <View style={styles.card}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <View style={styles.iconContainer}>

          <Text style={styles.icon}>
            🔍
          </Text>

        </View>


        <View style={styles.headerText}>

          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {object.name ||
              'Unknown Object'}
          </Text>


          <Text
            style={styles.category}
            numberOfLines={1}
          >
            {object.category ||
              'Unknown Category'}
          </Text>

        </View>


        <View
          style={styles.confidenceBadge}
        >

          <Text
            style={styles.confidenceText}
          >
            {confidencePercent}%
          </Text>

        </View>

      </View>


      {/* ======================================================
          DESCRIPTION
      ====================================================== */}

      {object.description ? (

        <View
          style={
            styles.descriptionContainer
          }
        >

          <Text
            style={styles.sectionTitle}
          >
            Description
          </Text>


          <Text
            style={styles.description}
          >
            {object.description}
          </Text>

        </View>

      ) : null}


      {/* ======================================================
          BASIC INFORMATION
      ====================================================== */}

      <View style={styles.section}>

        <Text
          style={styles.sectionTitle}
        >
          Basic Information
        </Text>


        <View style={styles.infoGrid}>

          <InfoItem
            label="Brand"
            value={object.brand}
            icon="🏷️"
          />


          <InfoItem
            label="Model"
            value={object.model}
            icon="📱"
          />


          <InfoItem
            label="Type"
            value={object.type}
            icon="📦"
          />


          <InfoItem
            label="Color"
            value={object.color}
            icon="🎨"
          />


          <InfoItem
            label="Material"
            value={object.material}
            icon="🧱"
          />


          <InfoItem
            label="Category"
            value={object.category}
            icon="📂"
          />

        </View>

      </View>


      {/* ======================================================
          FEATURES
      ====================================================== */}

      {features.length > 0 ? (

        <View style={styles.section}>

          <Text
            style={styles.sectionTitle}
          >
            Features
          </Text>


          <View
            style={
              styles.featuresContainer
            }
          >

            {features.map(
              (
                feature: string,
                index: number
              ) => (

                <View
                  key={`${feature}-${index}`}
                  style={styles.featureChip}
                >

                  <Text
                    style={styles.featureIcon}
                  >
                    ✓
                  </Text>


                  <Text
                    style={styles.featureText}
                  >
                    {feature}
                  </Text>

                </View>

              )
            )}

          </View>

        </View>

      ) : null}


      {/* ======================================================
          SEARCH QUERY
      ====================================================== */}

      {object.searchQuery ? (

        <View
          style={styles.searchContainer}
        >

          <Text
            style={styles.searchLabel}
          >
            Search Query
          </Text>


          <Text
            style={styles.searchQuery}
          >
            {object.searchQuery}
          </Text>

        </View>

      ) : null}

    </View>
  );
}


// ============================================================
// INFO ITEM
// ============================================================

type InfoItemProps = {
  label: string;

  value:
    | string
    | null
    | undefined;

  icon: string;
};


function InfoItem({
  label,
  value,
  icon,
}: InfoItemProps) {

  const displayValue =
    typeof value === 'string' &&
    value.trim().length > 0
      ? value.trim()
      : 'Unknown';


  return (

    <View style={styles.infoItem}>

      <Text
        style={styles.infoIcon}
      >
        {icon}
      </Text>


      <View
        style={styles.infoContent}
      >

        <Text
          style={styles.infoLabel}
        >
          {label}
        </Text>


        <Text
          style={[
            styles.infoValue,

            displayValue === 'Unknown' &&
              styles.unknownValue,
          ]}
          numberOfLines={2}
        >
          {displayValue}
        </Text>

      </View>

    </View>

  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ----------------------------------------------------------
  // CARD
  // ----------------------------------------------------------

  card: {
    marginHorizontal: 16,

    marginTop: 16,

    marginBottom: 12,

    padding: 18,

    borderRadius: 22,

    backgroundColor: '#FFFFFF',

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.08,

    shadowRadius: 8,

    elevation: 3,
  },


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  header: {
    flexDirection: 'row',

    alignItems: 'center',
  },


  iconContainer: {
    width: 52,

    height: 52,

    borderRadius: 16,

    backgroundColor: '#F1F5F9',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 12,
  },


  icon: {
    fontSize: 25,
  },


  headerText: {
    flex: 1,

    minWidth: 0,
  },


  title: {
    fontSize: 20,

    fontWeight: '800',

    color: '#111827',
  },


  category: {
    marginTop: 4,

    fontSize: 13,

    color: '#6B7280',

    fontWeight: '500',
  },


  confidenceBadge: {
    paddingHorizontal: 9,

    paddingVertical: 6,

    borderRadius: 10,

    backgroundColor: '#ECFDF5',

    marginLeft: 8,
  },


  confidenceText: {
    fontSize: 12,

    fontWeight: '700',

    color: '#059669',
  },


  // ----------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------

  descriptionContainer: {
    marginTop: 18,

    paddingTop: 16,

    borderTopWidth: 1,

    borderTopColor: '#F1F5F9',
  },


  description: {
    fontSize: 14,

    lineHeight: 21,

    color: '#4B5563',
  },


  // ----------------------------------------------------------
  // SECTIONS
  // ----------------------------------------------------------

  section: {
    marginTop: 20,

    paddingTop: 16,

    borderTopWidth: 1,

    borderTopColor: '#F1F5F9',
  },


  sectionTitle: {
    fontSize: 15,

    fontWeight: '800',

    color: '#111827',

    marginBottom: 10,
  },


  // ----------------------------------------------------------
  // INFORMATION GRID
  // ----------------------------------------------------------

  infoGrid: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    marginHorizontal: -5,
  },


  infoItem: {
    width: '50%',

    paddingHorizontal: 5,

    marginBottom: 14,

    flexDirection: 'row',

    alignItems: 'center',
  },


  infoIcon: {
    fontSize: 18,

    marginRight: 8,
  },


  infoContent: {
    flex: 1,

    minWidth: 0,
  },


  infoLabel: {
    fontSize: 11,

    color: '#9CA3AF',

    fontWeight: '600',

    marginBottom: 2,
  },


  infoValue: {
    fontSize: 13,

    color: '#1F2937',

    fontWeight: '700',

    flexShrink: 1,
  },


  unknownValue: {
    color: '#9CA3AF',

    fontWeight: '500',
  },


  // ----------------------------------------------------------
  // FEATURES
  // ----------------------------------------------------------

  featuresContainer: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,
  },


  featureChip: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F8FAFC',

    borderWidth: 1,

    borderColor: '#E5E7EB',

    borderRadius: 10,

    paddingHorizontal: 10,

    paddingVertical: 7,

    maxWidth: '100%',
  },


  featureIcon: {
    color: '#10B981',

    fontSize: 12,

    fontWeight: '800',

    marginRight: 5,
  },


  featureText: {
    fontSize: 12,

    color: '#374151',

    fontWeight: '600',

    flexShrink: 1,
  },


  // ----------------------------------------------------------
  // SEARCH QUERY
  // ----------------------------------------------------------

  searchContainer: {
    marginTop: 20,

    padding: 12,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',
  },


  searchLabel: {
    fontSize: 11,

    color: '#9CA3AF',

    fontWeight: '700',

    textTransform: 'uppercase',

    marginBottom: 5,
  },


  searchQuery: {
    fontSize: 13,

    color: '#374151',

    fontWeight: '600',
  },

});