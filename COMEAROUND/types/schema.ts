// Isolated types for COMEAROUND module

export type MerchantType = 'Restaurant' | 'Supermarket' | 'Pharmacy' | 'Water' | 'Flowers';

export type MerchantStatus = 'PENDING' | 'VERIFICATION_PENDING' | 'APPROVED' | 'SUSPENDED';

export interface Merchant {
    id: string;
    businessName: string;
    type: MerchantType;
    status: MerchantStatus;
    logoUrl?: string;
    coverImageUrl?: string;
    description: string;
    ownerName: string;
    ownerPhone: string;
    email: string;
    kraPin?: string;
    documents?: Record<string, { url: string; filename?: string; uploadedAt?: string }>;
    createdAt: Date;
    isActive: boolean;
    mpesaShortcode: string;
    deliveryFee?: number;
    operatingHours?: string;
    address?: string;
    taxRate?: number;
    mpesaTillNumber?: string;
    notificationEmail?: string;
    notificationPhone?: string;
    branding?: {
        primaryColor: string;
        secondaryColor: string;
        bannerUrl?: string;
    };
    customSettings?: {
        kitchenPrepTimeMin?: number;
        cutleryRequired?: boolean;
        dietaryTags?: string[];
        pharmacistName?: string;
        licenseNumber?: string;
        acceptInsurance?: boolean;
        lowStockThreshold?: number;
        bulkPurchaseLimit?: number;
        [key: string]: any;
    };
}

export interface MerchantLocation {
    id: string;
    merchantId: string;
    branchName: string;
    address: string;
    geo: {
        lat: number;
        lng: number;
    };
    deliveryRadiusKm: number;
    isActive: boolean;
}

export interface Product {
    id: string;
    merchantId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
    categoryId?: string;
    isFeatured?: boolean;
    tags?: string[];
    preparationTimeMin?: number;
    sku?: string;
    stockLevel?: number;
    barcode?: string;
    vatRate?: number;
    isPrescriptionRequired?: boolean;
}

export type OrderStatus =
    | 'CREATED'
    | 'PAYMENT_PENDING'
    | 'PAYMENT_CONFIRMED'
    | 'AWAITING_MERCHANT_ACTION'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'PACKING'
    | 'READY_FOR_PICKUP'
    | 'RIDER_ASSIGNED'
    | 'PICKED_UP'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'FAILED';

export interface Order {
    id: string;
    merchantId: string;
    customer: {
        id?: string;
        name: string;
        phone: string;
        email?: string;
        orders_count?: number;
    };
    items: Array<{
        productId?: string;
        name: string;
        quantity: number;
        price: number;
        options?: string[];
    }>;
    total: number;
    payment?: {
        method: string;
        status: string;
        mpesa_code?: string;
        amount_paid?: number;
    };
    status: OrderStatus;
    placedAt?: Date;
    time_placed?: string;
    delivery_address?: string;
    notes?: string;
    riderId?: string;
}

export interface MerchantWarning {
    id: string;
    merchantId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    details: string;
    issuedBy: string;
    issuedAt: Date;
    acknowledged?: boolean;
}

export interface MerchantComplaint {
    id: string;
    merchantId: string;
    category: 'QUALITY' | 'DELIVERY' | 'BEHAVIOR' | 'FRAUD' | 'OTHER';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    subject: string;
    description: string;
    filedBy: string;
    filedAt: Date;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
    resolution?: string;
}

export interface Rider {
    id: string;
    name: string;
    phone: string;
    vehicleType: 'Motorbike' | 'Bicycle' | 'Foot' | 'Car';
    isOnline: boolean;
    status: 'IDLE' | 'BUSY' | 'AWAY' | 'PICKING_UP' | 'DELIVERING';
    currentOrderId?: string;
    earnings: {
        today: number;
        weekly?: number;
        total?: number;
    };
    currentLocation?: {
        lat: number;
        lng: number;
    };
    wallet: {
        balance: number;
        pending: number;
    };
    performance: {
        rating: number;
        acceptanceRate: number;
        reliabilityScore: number;
        completionRate: number;
        onTimeRate: number;
    };
    vehicle?: {
        make: string;
        model: string;
        plate: string;
    };
    documents?: Record<string, { url: string; filename?: string; uploadedAt?: string }>;
}
