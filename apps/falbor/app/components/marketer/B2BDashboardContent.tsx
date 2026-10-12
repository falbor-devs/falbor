'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '~/lib/actions/dashboard-stats';
import { getMarketerOnboardingStatus, createMarketerProduct } from '~/lib/actions/marketer-products';
import { getMarketerProfileData } from '~/lib/actions/get-marketer-profile';
import { getMarketerEarningsStats } from '~/lib/actions/earnings-actions';
import { toast } from 'react-toastify';

import { DashboardHeader } from './DashboardHeader';
import { QuickActionsHeader } from './QuickActionsHeader';
import { DashboardGetStarted } from './DashboardGetStarted';
import { DashboardStatsGrid } from './DashboardStatsGrid';
import { CreateProductModal } from './CreateProductModal';

interface B2BDashboardContentProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
}

export function B2BDashboardContent({ profile }: B2BDashboardContentProps) {
  const [stats, setStats] = useState({
    totalMessages: 0,
    newMessages: 0,
    totalProducts: 0,
    totalSales: 0,
  });

  const [activityNotifications, setActivityNotifications] = useState<{
    sales: any[];
    payouts: any[];
  }>({ sales: [], payouts: [] });

  const [onboardingStatus, setOnboardingStatus] = useState<{ profileComplete: boolean; productsCount: number }>({
    profileComplete: false,
    productsCount: 0,
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [userSpecialties, setUserSpecialties] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [price, setPrice] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [originalPrice, setOriginalPrice] = useState('');
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getDashboardStats().then((data) => setStats(data));
    getMarketerOnboardingStatus().then((status) => setOnboardingStatus(status));
    getMarketerEarningsStats().then((earningsData) => {
      setActivityNotifications({
        sales: earningsData.transactions || [],
        payouts: earningsData.payouts || [],
      });
    });
    getMarketerProfileData().then((p) => {
      const specs = p?.specialties as string[] | undefined;
      if (specs && Array.isArray(specs) && specs.length > 0) {
        setUserSpecialties(specs);
        setService(specs[0]);
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - imageFiles.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImageFiles((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !service.trim() || !price) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (onboardingStatus.productsCount >= 3) {
      toast.error('Maximum limit of 3 products reached.');
      return;
    }

    setIsSubmitting(true);
    const result = await createMarketerProduct({
      name: name.trim(),
      service: service.trim(),
      price: Number(price),
      originalPrice: hasDiscount && originalPrice ? Number(originalPrice) : undefined,
      portfolioImages: imageFiles,
    });
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Product created successfully!');
      setIsProductModalOpen(false);
      setName('');
      setPrice('');
      setHasDiscount(false);
      setOriginalPrice('');
      setImageFiles([]);
      loadData();
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white font-sans p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <DashboardHeader profile={profile} activityNotifications={activityNotifications} />
        <QuickActionsHeader
          profileId={profile.id}
          onOpenProductModal={() => setIsProductModalOpen(true)}
        />
        <DashboardGetStarted
          profileId={profile.id}
          onboardingStatus={onboardingStatus}
          totalSales={stats.totalSales}
          onOpenProductModal={() => setIsProductModalOpen(true)}
        />
        <DashboardStatsGrid stats={stats} />
      </div>

      <CreateProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        userSpecialties={userSpecialties}
        name={name}
        setName={setName}
        service={service}
        setService={setService}
        price={price}
        setPrice={setPrice}
        hasDiscount={hasDiscount}
        setHasDiscount={setHasDiscount}
        originalPrice={originalPrice}
        setOriginalPrice={setOriginalPrice}
        imageFiles={imageFiles}
        handleImageUpload={handleImageUpload}
        handleRemoveImage={handleRemoveImage}
        handleSubmit={handleCreateProduct}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}
