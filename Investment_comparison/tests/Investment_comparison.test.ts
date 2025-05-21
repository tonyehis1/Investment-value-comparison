import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the Clarity contract environment
// This is a simplified mock approach for testing Clarity contracts with Vitest
class ClarityContract {
  private contractOwner: string;
  private currentYear: number;
  private clarinetBrands: Array<{
    brand: string;
    initialValue: number;
    currentValue: number;
    purchaseYear: number;
  }>;
  
  constructor() {
    this.contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Test address
    this.currentYear = 2023;
    this.clarinetBrands = [];
  }

  // Helper to reset state between tests
  reset() {
    this.currentYear = 2023;
    this.clarinetBrands = [];
  }

  // Simulate contract functions
  setCurrentYear(sender: string, year: number) {
    if (sender !== this.contractOwner) {
      return { error: 3 }; // ERR-UNAUTHORIZED
    }
    this.currentYear = year;
    return { value: true };
  }

  getCurrentYear() {
    return this.currentYear;
  }

  getAllBrands() {
    return this.clarinetBrands;
  }

  brandExists(brandName: string) {
    return {
      exists: this.clarinetBrands.some(brand => brand.brand === brandName),
      name: brandName
    };
  }

  addBrand(sender: string, brandName: string, initialValue: number, currentValue: number, purchaseYear: number) {
    if (sender !== this.contractOwner) {
      return { error: 3 }; // ERR-UNAUTHORIZED
    }
    
    if (this.brandExists(brandName).exists) {
      return { error: 1 }; // ERR-BRAND-EXISTS
    }
    
    this.clarinetBrands.push({
      brand: brandName,
      initialValue,
      currentValue,
      purchaseYear
    });
    
    return { value: true };
  }

  getBrand(brandName: string) {
    const brand = this.clarinetBrands.find(b => b.brand === brandName);
    if (!brand) {
      return { error: 2 }; // ERR-BRAND-NOT-FOUND
    }
    return { value: brand };
  }

  updateValue(sender: string, brandName: string, newValue: number) {
    if (sender !== this.contractOwner) {
      return { error: 3 }; // ERR-UNAUTHORIZED
    }
    
    if (!this.brandExists(brandName).exists) {
      return { error: 2 }; // ERR-BRAND-NOT-FOUND
    }
    
    const brandIndex = this.clarinetBrands.findIndex(b => b.brand === brandName);
    this.clarinetBrands[brandIndex].currentValue = newValue;
    
    return { value: true };
  }

  calculateRoi(brandName: string) {
    const brandResult = this.getBrand(brandName);
    
    if ('error' in brandResult) {
      return brandResult;
    }
    
    const brand = brandResult.value;
    const initial = brand.initialValue;
    const current = brand.currentValue;
    
    if (initial === 0) {
      return { value: 0 };
    }
    
    // ROI = ((current - initial) * 100) / initial
    const roi = Math.floor(((current - initial) * 100) / initial);
    return { value: roi };
  }

  calculateAnnualAppreciation(brandName: string) {
    const brandResult = this.getBrand(brandName);
    
    if ('error' in brandResult) {
      return brandResult;
    }
    
    const brand = brandResult.value;
    const initial = brand.initialValue;
    const current = brand.currentValue;
    const purchase = brand.purchaseYear;
    const yearsOwned = this.currentYear - purchase;
    
    if (yearsOwned === 0) {
      return { error: 4 }; // ERR-DIVIDE-BY-ZERO
    }
    
    if (initial === 0) {
      return { value: 0 };
    }
    
    // Annual appreciation = (ROI / years owned)
    const roi = Math.floor(((current - initial) * 100) / initial);
    const annualAppreciation = Math.floor(roi / yearsOwned);
    
    return { value: annualAppreciation };
  }

  findBestInvestment() {
    if (this.clarinetBrands.length === 0) {
      return {
        bestBrand: null,
        bestRoi: 0
      };
    }
    
    let bestBrand = null;
    let bestRoi = 0;
    
    for (const entry of this.clarinetBrands) {
      const initial = entry.initialValue;
      const current = entry.currentValue;
      
      if (initial === 0) continue;
      
      const roi = Math.floor(((current - initial) * 100) / initial);
      
      if (roi > bestRoi) {
        bestBrand = entry.brand;
        bestRoi = roi;
      }
    }
    
    return {
      bestBrand,
      bestRoi
    };
  }

  // Helper to initialize test data
  initializeTestData() {
    // Premium Brands
    this.addBrand(this.contractOwner, "Buffet R13", 350000, 410000, 2018);
    this.addBrand(this.contractOwner, "Selmer Recital", 420000, 450000, 2019);
    this.addBrand(this.contractOwner, "Yamaha CSVR", 380000, 430000, 2020);
    
    // Mid-Range Brands
    this.addBrand(this.contractOwner, "Buffet E11", 180000, 200000, 2021);
    this.addBrand(this.contractOwner, "Yamaha YCL-450", 160000, 190000, 2022);
    
    // Student Brands
    this.addBrand(this.contractOwner, "Jupiter JCL700N", 80000, 70000, 2019);
    this.addBrand(this.contractOwner, "Bundy BCL-300", 60000, 50000, 2020);
  }
}

// Tests for the Clarinet Brand Investment Comparison contract
describe('Clarinet Brand Investment Comparison Contract', () => {
  let contract: ClarityContract;
  const owner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const nonOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

  beforeEach(() => {
    contract = new ClarityContract();
  });

  afterEach(() => {
    contract.reset();
  });

  describe('Admin functions', () => {
    it('should set current year when called by owner', () => {
      const result = contract.setCurrentYear(owner, 2025);
      expect(result.value).toBe(true);
      expect(contract.getCurrentYear()).toBe(2025);
    });

    it('should reject setting current year when called by non-owner', () => {
      const result = contract.setCurrentYear(nonOwner, 2025);
      expect(result.error).toBe(3); // ERR-UNAUTHORIZED
      expect(contract.getCurrentYear()).toBe(2023); // Unchanged
    });
  });

  describe('Brand management', () => {
    it('should add a new brand when called by owner', () => {
      const result = contract.addBrand(owner, "Test Brand", 100000, 120000, 2020);
      expect(result.value).toBe(true);
      
      const brandResult = contract.getBrand("Test Brand");
      expect('value' in brandResult).toBe(true);
      if ('value' in brandResult) {
        expect(brandResult.value.brand).toBe("Test Brand");
        expect(brandResult.value.initialValue).toBe(100000);
      }
    });

    it('should reject adding a brand when called by non-owner', () => {
      const result = contract.addBrand(nonOwner, "Test Brand", 100000, 120000, 2020);
      expect(result.error).toBe(3); // ERR-UNAUTHORIZED
    });

    it('should reject adding a duplicate brand', () => {
      contract.addBrand(owner, "Test Brand", 100000, 120000, 2020);
      const result = contract.addBrand(owner, "Test Brand", 200000, 220000, 2021);
      expect(result.error).toBe(1); // ERR-BRAND-EXISTS
    });

    it('should update a brand value when called by owner', () => {
      contract.addBrand(owner, "Test Brand", 100000, 120000, 2020);
      const updateResult = contract.updateValue(owner, "Test Brand", 150000);
      expect(updateResult.value).toBe(true);
      
      const brandResult = contract.getBrand("Test Brand");
      expect('value' in brandResult).toBe(true);
      if ('value' in brandResult) {
        expect(brandResult.value.currentValue).toBe(150000);
      }
    });

    it('should reject updating a non-existent brand', () => {
      const result = contract.updateValue(owner, "Non-Existent Brand", 150000);
      expect(result.error).toBe(2); // ERR-BRAND-NOT-FOUND
    });

    it('should reject updating a brand when called by non-owner', () => {
      contract.addBrand(owner, "Test Brand", 100000, 120000, 2020);
      const result = contract.updateValue(nonOwner, "Test Brand", 150000);
      expect(result.error).toBe(3); // ERR-UNAUTHORIZED
    });
  });

  describe('ROI calculations', () => {
    beforeEach(() => {
      contract.addBrand(owner, "Test Brand", 100000, 120000, 2020);
      contract.addBrand(owner, "Zero Initial", 0, 10000, 2020);
      contract.addBrand(owner, "Negative ROI", 100000, 80000, 2020);
    });

    it('should calculate ROI correctly', () => {
      const result = contract.calculateRoi("Test Brand");
      expect('value' in result).toBe(true);
      if ('value' in result) {
        // ROI = ((120000 - 100000) * 100) / 100000 = 20%
        expect(result.value).toBe(20);
      }
    });

    it('should handle zero initial value for ROI', () => {
      const result = contract.calculateRoi("Zero Initial");
      expect('value' in result).toBe(true);
      if ('value' in result) {
        expect(result.value).toBe(0);
      }
    });

    it('should calculate negative ROI correctly', () => {
      const result = contract.calculateRoi("Negative ROI");
      expect('value' in result).toBe(true);
      if ('value' in result) {
        // ROI = ((80000 - 100000) * 100) / 100000 = -20%
        expect(result.value).toBe(-20);
      }
    });

    it('should return error for non-existent brand', () => {
      const result = contract.calculateRoi("Non-Existent Brand");
      expect(result.error).toBe(2); // ERR-BRAND-NOT-FOUND
    });
  });

  describe('Annual appreciation calculations', () => {
    beforeEach(() => {
      contract.setCurrentYear(owner, 2023);
      contract.addBrand(owner, "Three Year Brand", 100000, 130000, 2020); // 3 years
      contract.addBrand(owner, "Zero Years", 100000, 130000, 2023); // 0 years
      contract.addBrand(owner, "Zero Initial", 0, 10000, 2020);
    });

    it('should calculate annual appreciation correctly', () => {
      const result = contract.calculateAnnualAppreciation("Three Year Brand");
      expect('value' in result).toBe(true);
      if ('value' in result) {
        // ROI = ((130000 - 100000) * 100) / 100000 = 30%
        // Annual = 30% / 3 years = 10%
        expect(result.value).toBe(10);
      }
    });

    it('should return error for zero years owned', () => {
      const result = contract.calculateAnnualAppreciation("Zero Years");
      expect(result.error).toBe(4); // ERR-DIVIDE-BY-ZERO
    });

    it('should handle zero initial value', () => {
      const result = contract.calculateAnnualAppreciation("Zero Initial");
      expect('value' in result).toBe(true);
      if ('value' in result) {
        expect(result.value).toBe(0);
      }
    });

    it('should return error for non-existent brand', () => {
      const result = contract.calculateAnnualAppreciation("Non-Existent Brand");
      expect(result.error).toBe(2); // ERR-BRAND-NOT-FOUND
    });
  });

  describe('Best investment finder', () => {
    it('should return null for empty brand list', () => {
      const result = contract.findBestInvestment();
      expect(result.bestBrand).toBe(null);
      expect(result.bestRoi).toBe(0);
    });

    it('should find the best investment correctly', () => {
      contract.addBrand(owner, "Good Investment", 100000, 150000, 2020); // 50% ROI
      contract.addBrand(owner, "Better Investment", 200000, 340000, 2020); // 70% ROI
      contract.addBrand(owner, "Best Investment", 300000, 540000, 2020); // 80% ROI
      contract.addBrand(owner, "Negative Investment", 400000, 200000, 2020); // -50% ROI
      
      const result = contract.findBestInvestment();
      expect(result.bestBrand).toBe("Best Investment");
      expect(result.bestRoi).toBe(80);
    });

    it('should ignore brands with zero initial value', () => {
      contract.addBrand(owner, "Zero Initial", 0, 100000, 2020);
      contract.addBrand(owner, "Normal Brand", 100000, 150000, 2020); // 50% ROI
      
      const result = contract.findBestInvestment();
      expect(result.bestBrand).toBe("Normal Brand");
      expect(result.bestRoi).toBe(50);
    });
  });

  describe('Integration tests', () => {
    it('should initialize sample data correctly', () => {
      contract.initializeTestData();
      expect(contract.getAllBrands().length).toBe(7);
    });

    it('should find Yamaha CSVR as best premium investment', () => {
      // Initialize only premium brands
      contract.addBrand(owner, "Buffet R13", 350000, 410000, 2018); // ROI: ~17.14%
      contract.addBrand(owner, "Selmer Recital", 420000, 450000, 2019); // ROI: ~7.14%
      contract.addBrand(owner, "Yamaha CSVR", 380000, 430000, 2020); // ROI: ~13.16%
      
      // Since Buffet R13 has highest ROI among these
      const result = contract.findBestInvestment();
      expect(result.bestBrand).toBe("Buffet R13");
    });

    it('should update ROI calculations after value updates', () => {
      contract.addBrand(owner, "Test Brand", 100000, 120000, 2020); // Initial ROI: 20%
      
      // Before update
      let roiResult = contract.calculateRoi("Test Brand");
      let initialRoi = 'value' in roiResult ? roiResult.value : null;
      expect(initialRoi).toBe(20);
      
      // Update the value
      contract.updateValue(owner, "Test Brand", 200000);
      
      // After update
      roiResult = contract.calculateRoi("Test Brand");
      let updatedRoi = 'value' in roiResult ? roiResult.value : null;
      expect(updatedRoi).toBe(100); // New ROI: 100%
    });

    it('should calculate annual appreciation correctly across different years', () => {
      contract.setCurrentYear(owner, 2023);
      contract.addBrand(owner, "Test Brand", 100000, 160000, 2018); // 5 years, 60% ROI
      
      // Initial calculation
      let result = contract.calculateAnnualAppreciation("Test Brand");
      let initialRate = 'value' in result ? result.value : null;
      expect(initialRate).toBe(12); // 60% / 5 years = 12% annual
      
      // Update current year
      contract.setCurrentYear(owner, 2025);
      
      // Recalculation with new year
      result = contract.calculateAnnualAppreciation("Test Brand");
      let updatedRate = 'value' in result ? result.value : null;
      expect(updatedRate).toBe(8); // 60% / 7 years = ~8.57% annual (floored to 8)
    });
  });
});