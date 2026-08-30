import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  HeartHandshake,
  Home,
  ListChecks,
  Mail,
  MapPin,
  Mountain,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

interface AboutItem {
  title: string;
  description: string;
}

export interface AboutCopy {
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  journeyLabel: string;
  journeyPlace: string;
  journeyTeam: string;
  journeyDeparture: string;
  missionEyebrow: string;
  missionTitle: string;
  missionDescription: string;
  capabilitiesTitle: string;
  capabilities: AboutItem[];
  principlesEyebrow: string;
  principlesTitle: string;
  principlesDescription: string;
  principles: AboutItem[];
  safetyTitle: string;
  safetyDescription: string;
  contactEyebrow: string;
  contactTitle: string;
  contactDescription: string;
  contactAction: string;
}

const capabilityIcons = [MapPin, UsersRound, ListChecks];
const principleIcons = [CheckCircle2, HeartHandshake, ShieldCheck];

export function AboutContent({ copy }: { copy: AboutCopy }) {
  const journey = [copy.journeyPlace, copy.journeyTeam, copy.journeyDeparture];

  return (
    <main className="bg-background text-foreground">
      <section className="overflow-hidden border-b border-border bg-brand-subtle/50">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <nav
              aria-label={copy.breadcrumbCurrent}
              className="mb-10 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <a
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                {copy.breadcrumbHome}
              </a>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span aria-current="page" className="font-medium text-foreground">
                {copy.breadcrumbCurrent}
              </span>
            </nav>

            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {copy.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/locations"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                {copy.primaryAction}
              </a>
              <a
                href="/teams"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copy.secondaryAction}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary">
                <Mountain className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">
                {copy.journeyLabel}
              </p>
            </div>
            <ol className="mt-7 space-y-6">
              {journey.map((item, index) => (
                <li
                  key={item}
                  className="grid grid-cols-[2rem_1fr] items-start gap-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <div className="pt-1">
                    <p className="font-medium text-foreground">{item}</p>
                    {index < journey.length - 1 && (
                      <span
                        className="mt-4 block h-6 border-s border-dashed border-primary/30"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {copy.missionEyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            {copy.missionTitle}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            {copy.missionDescription}
          </p>
        </div>

        <div aria-labelledby="about-capabilities-title">
          <h2 id="about-capabilities-title" className="text-section-h2">
            {copy.capabilitiesTitle}
          </h2>
          <div className="mt-6 space-y-7">
            {copy.capabilities.map((item, index) => {
              const Icon = capabilityIcons[index] ?? Compass;
              return (
                <article
                  key={item.title}
                  className="grid grid-cols-[3rem_1fr] gap-4"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="pt-1">
                    <h3 className="text-card-h3 text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-secondary/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {copy.principlesEyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              {copy.principlesTitle}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {copy.principlesDescription}
            </p>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {copy.principles.map((item, index) => {
              const Icon = principleIcons[index] ?? ShieldCheck;
              return (
                <article key={item.title} className="space-y-4">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="text-card-h3 text-foreground">{item.title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>

          <aside className="mt-12 flex gap-4 rounded-2xl border border-warning/20 bg-warning-subtle p-5 sm:p-6">
            <ShieldCheck
              className="mt-0.5 h-6 w-6 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-section-h2">{copy.safetyTitle}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
                {copy.safetyDescription}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid gap-8 rounded-3xl bg-foreground p-7 text-background sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {copy.contactEyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              {copy.contactTitle}
            </h2>
            <p className="mt-4 text-sm leading-7 text-background/75 sm:text-base">
              {copy.contactDescription}
            </p>
          </div>
          <a
            href="mailto:hi@gomate.live"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {copy.contactAction}
            <span className="text-primary-foreground/75">hi@gomate.live</span>
          </a>
        </div>
      </section>
    </main>
  );
}
