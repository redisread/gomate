"use client";

import * as React from "react";
import { Loader2, ArrowLeft, User, FileText, MapPin, MessageCircle, Mail } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useProfileForm } from "./use-profile-form";
import { SECTION_ICONS } from "./constants";
import {
  Card, CardSection, AvatarSection, BasicInfoFields,
  OutdoorInfoFields, ContactFields, MessageBanner, ActionBar,
} from "./profile-form-fields";

export function ProfileEditClient() {
  const { t } = useI18n(["profile", "common"]);
  const ctx = useProfileForm();

  if (ctx.isLoading) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 dark:text-amber-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <a href="/profile" className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors text-sm mb-8">
          <ArrowLeft className="h-4 w-4" />{t('profile.backProfile')}
        </a>
        <div className="mb-8 flex items-start gap-4">
          <div className="w-1 h-12 rounded-full bg-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('profile.editTitle')}</h1>
            <p className="text-stone-500 dark:text-stone-400 mt-1 text-sm">{t('profile.editWarmSubtitle')}</p>
          </div>
        </div>
        <form onSubmit={ctx.handleSubmit} className="space-y-5">
          <Card>
            <CardSection icon={SECTION_ICONS.avatar} title={t('profile.sectionAvatar')} />
            <AvatarSection
              user={ctx.user}
              avatarPreview={ctx.avatarPreview}
              selectedFile={ctx.selectedFile}
              isUploading={ctx.isUploading}
              fileInputRef={ctx.fileInputRef}
              onFileChange={ctx.handleFileChange}
              onCancelFile={ctx.cancelSelectedFile}
            />
          </Card>
          <Card>
            <CardSection icon={SECTION_ICONS.basic} title={t('profile.sectionBasicInfo')} />
            <BasicInfoFields
              userName={ctx.user?.name || ""}
              nickname={ctx.formData.nickname}
              bio={ctx.formData.bio}
              bioLength={ctx.bioLength}
              bioNearLimit={ctx.bioNearLimit}
              bioAtLimit={ctx.bioAtLimit}
              onChange={ctx.handleChange}
            />
          </Card>
          <Card>
            <CardSection icon={SECTION_ICONS.outdoor} title={t('profile.sectionOutdoorInfo')} />
            <OutdoorInfoFields
              level={ctx.formData.level}
              experience={ctx.formData.experience}
              equipment={ctx.formData.equipment}
              equipmentInput={ctx.equipmentInput}
              onChange={ctx.handleChange}
              onEquipmentKeyDown={ctx.handleEquipmentKeyDown}
              onRemoveEquipment={ctx.handleRemoveEquipment}
              onAddPresetEquipment={ctx.handleAddPresetEquipment}
              onEquipmentInputChange={ctx.setEquipmentInput}
            />
          </Card>
          <Card>
            <CardSection icon={SECTION_ICONS.contact} title={t('profile.sectionContact')} />
            <ContactFields
              wechat={ctx.formData.wechat}
              gender={ctx.formData.gender}
              birthday={ctx.formData.birthday}
              onChange={ctx.handleChange}
            />
          </Card>
          <Card>
            <CardSection icon={SECTION_ICONS.account} title={t('profile.sectionAccount')} />
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t('profile.emailLabel')}</span>
              <input value={ctx.user?.email || ""} disabled className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed focus:outline-none transition-all" />
              <p className="text-xs text-stone-400 dark:text-stone-500">{t('profile.emailReadonly')}</p>
            </div>
          </Card>
          <MessageBanner message={ctx.message} />
          <ActionBar isSaving={ctx.isSaving} isUploading={ctx.isUploading} savedDone={ctx.savedDone} />
        </form>
      </div>
      <Footer />
    </main>
  );
}
