"use client";

import * as React from "react";
import { Loader2, ArrowLeft } from "lucide-react";
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
      <div
        data-testid="profile-edit-shell"
        className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-24 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:px-8"
      >
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={t('profile.editTitle')}>
          <a href="/profile" className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200">
            <ArrowLeft className="h-4 w-4" />{t('profile.backProfile')}
          </a>
          <div className="mt-8 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">GoMate</p>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{t('profile.editTitle')}</h1>
            <p className="text-sm leading-6 text-stone-500 dark:text-stone-400">{t('profile.editWarmSubtitle')}</p>
          </div>
          <nav aria-label={t('profile.editTitle')} className="mt-8 hidden space-y-1.5 lg:block">
            {[
              ['profile-avatar', t('profile.sectionAvatar')],
              ['profile-basic', t('profile.sectionBasicInfo')],
              ['profile-outdoor', t('profile.sectionOutdoorInfo')],
              ['profile-contact', t('profile.sectionContact')],
              ['profile-account', t('profile.sectionAccount')],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-white hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <form onSubmit={ctx.handleSubmit} className="min-w-0 max-w-3xl space-y-6">
          <Card id="profile-avatar">
            <CardSection id="profile-avatar-title" icon={SECTION_ICONS.avatar} title={t('profile.sectionAvatar')} />
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
          <Card id="profile-basic">
            <CardSection id="profile-basic-title" icon={SECTION_ICONS.basic} title={t('profile.sectionBasicInfo')} />
            <BasicInfoFields
              userName={ctx.user?.name || ""}
              nickname={ctx.formData.nickname}
              bio={ctx.formData.bio}
              bioLength={ctx.bioLength}
              bioNearLimit={ctx.bioNearLimit}
              bioAtLimit={ctx.bioAtLimit}
              onChange={ctx.handleChange}
              regionId={ctx.formData.regionId}
              regions={ctx.regions}
              onRegionChange={ctx.handleRegionChange}
            />
          </Card>
          <Card id="profile-outdoor">
            <CardSection id="profile-outdoor-title" icon={SECTION_ICONS.outdoor} title={t('profile.sectionOutdoorInfo')} />
            <OutdoorInfoFields
              level={ctx.formData.level}
              onChange={ctx.handleChange}
            />
          </Card>
          <Card id="profile-contact">
            <CardSection id="profile-contact-title" icon={SECTION_ICONS.contact} title={t('profile.sectionContact')} />
            <ContactFields
              wechat={ctx.formData.wechat}
              gender={ctx.formData.gender}
              birthday={ctx.formData.birthday}
              onChange={ctx.handleChange}
            />
          </Card>
          <Card id="profile-account">
            <CardSection id="profile-account-title" icon={SECTION_ICONS.account} title={t('profile.sectionAccount')} />
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t('profile.emailLabel')}</span>
              <input value={ctx.user?.email || ""} disabled className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed focus:outline-none transition-[transform,background-color,border-color,color,opacity,box-shadow]" />
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
