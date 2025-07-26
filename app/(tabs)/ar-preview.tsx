import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function ARPreview() {
  const [isARActive, setIsARActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [arMode, setARMode] = useState('placement'); // placement, size, color

  const startARSession = () => {
    setIsARActive(true);
    // In a real implementation, this would initialize the AR camera
    Alert.alert(
      'AR Preview Active',
      'Point your camera at a flat surface to place the product. Use gestures to move, rotate, and resize.',
      [{ text: 'Got it!' }]
    );
  };

  const stopARSession = () => {
    setIsARActive(false);
  };

  const takeScreenshot = () => {
    Alert.alert(
      'Screenshot Saved',
      'AR preview has been saved to your gallery. Share it with friends!',
      [
        { text: 'Share', onPress: () => console.log('Share screenshot') },
        { text: 'OK' }
      ]
    );
  };

  const switchARMode = (mode) => {
    setARMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Product Preview</Text>
        <TouchableOpacity onPress={takeScreenshot} style={styles.screenshotButton}>
          <Ionicons name="camera" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* AR Camera View */}
      <View style={styles.cameraContainer}>
        {!isARActive ? (
          <View style={styles.arPlaceholder}>
            <Ionicons name="cube-outline" size={80} color="#CCC" />
            <Text style={styles.placeholderTitle}>AR Product Preview</Text>
            <Text style={styles.placeholderSubtitle}>
              See how products look in your space before buying
            </Text>
            <TouchableOpacity style={styles.startARButton} onPress={startARSession}>
              <Ionicons name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.startARText}>Start AR Preview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.arActiveView}>
            {/* Simulated AR Camera View */}
            <View style={styles.arOverlay}>
              <View style={styles.crosshair}>
                <View style={styles.crosshairLine} />
                <View style={[styles.crosshairLine, styles.crosshairVertical]} />
              </View>
              
              {/* AR Product Placeholder */}
              <View style={styles.arProduct}>
                <View style={styles.productShadow} />
                <View style={styles.product3D}>
                  <Text style={styles.productLabel}>iPhone 15 Pro</Text>
                </View>
              </View>

              {/* AR Instructions */}
              <View style={styles.arInstructions}>
                <Text style={styles.instructionText}>
                  {arMode === 'placement' && 'Tap to place product'}
                  {arMode === 'size' && 'Pinch to resize'}
                  {arMode === 'color' && 'Tap to change color'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* AR Controls */}
      {isARActive && (
        <View style={styles.controlsContainer}>
          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, arMode === 'placement' && styles.activeModeButton]}
              onPress={() => switchARMode('placement')}
            >
              <Ionicons name="move" size={20} color={arMode === 'placement' ? '#FFFFFF' : '#666'} />
              <Text style={[styles.modeText, arMode === 'placement' && styles.activeModeText]}>
                Place
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modeButton, arMode === 'size' && styles.activeModeButton]}
              onPress={() => switchARMode('size')}
            >
              <Ionicons name="resize" size={20} color={arMode === 'size' ? '#FFFFFF' : '#666'} />
              <Text style={[styles.modeText, arMode === 'size' && styles.activeModeText]}>
                Size
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modeButton, arMode === 'color' && styles.activeModeButton]}
              onPress={() => switchARMode('color')}
            >
              <Ionicons name="color-palette" size={20} color={arMode === 'color' ? '#FFFFFF' : '#666'} />
              <Text style={[styles.modeText, arMode === 'color' && styles.activeModeText]}>
                Color
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={takeScreenshot}>
              <Ionicons name="camera" size={24} color="#2E7D32" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social" size={24} color="#2E7D32" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart" size={24} color="#2E7D32" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={stopARSession}>
              <Ionicons name="stop" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Product Info Panel */}
      <View style={styles.productInfoPanel}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>iPhone 15 Pro Max</Text>
          <Text style={styles.productPrice}>₹1,34,900</Text>
          <View style={styles.productFeatures}>
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>AR Compatible</Text>
            </View>
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>360° View</Text>
            </View>
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>True Scale</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.addToCartButton}>
          <Ionicons name="bag-add" size={20} color="#FFFFFF" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>

      {/* AR Features Info */}
      {!isARActive && (
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>AR Preview Features</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="cube" size={24} color="#2E7D32" />
            <View style={styles.featureContent}>
              <Text style={styles.featureItemTitle}>True-to-Scale Visualization</Text>
              <Text style={styles.featureItemDescription}>
                See products in actual size in your space
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="color-palette" size={24} color="#FF9800" />
            <View style={styles.featureContent}>
              <Text style={styles.featureItemTitle}>Color & Material Preview</Text>
              <Text style={styles.featureItemDescription}>
                Try different colors and finishes
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color="#1976D2" />
            <View style={styles.featureContent}>
              <Text style={styles.featureItemTitle}>Share AR Screenshots</Text>
              <Text style={styles.featureItemDescription}>
                Capture and share your AR experience
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="move" size={24} color="#7B1FA2" />
            <View style={styles.featureContent}>
              <Text style={styles.featureItemTitle}>Interactive Placement</Text>
              <Text style={styles.featureItemDescription}>
                Move, rotate, and resize with gestures
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#2E7D32',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  screenshotButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  arPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  startARButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startARText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  arActiveView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  arOverlay: {
    flex: 1,
    position: 'relative',
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginTop: -20,
    marginLeft: -20,
    zIndex: 10,
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    width: 40,
    height: 2,
    top: 19,
  },
  crosshairVertical: {
    width: 2,
    height: 40,
    left: 19,
    top: 0,
  },
  arProduct: {
    position: 'absolute',
    bottom: '30%',
    left: '50%',
    marginLeft: -60,
    alignItems: 'center',
  },
  productShadow: {
    width: 120,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 60,
    marginBottom: 8,
  },
  product3D: {
    width: 120,
    height: 120,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  productLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  arInstructions: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  activeModeButton: {
    backgroundColor: '#2E7D32',
  },
  modeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  activeModeText: {
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  productInfoPanel: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  productFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureContent: {
    marginLeft: 16,
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});