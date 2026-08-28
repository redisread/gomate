import satori from "satori";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POSTER_PRESETS } from "./poster-presets";
import { renderLocationPoster } from "./location-poster";
import { renderTeamPoster } from "./team-poster";

vi.mock("satori", () => ({ default: vi.fn(async (tree: unknown) => JSON.stringify(tree)) }));

const mockedSatori = vi.mocked(satori);

interface RenderedTree {
  props: {
    style: Record<string, unknown>;
    children: Array<{ props: { style: Record<string, unknown> } }>;
  };
}

function renderedTree(): RenderedTree {
  return mockedSatori.mock.calls.at(-1)?.[0] as unknown as RenderedTree;
}

describe("poster preset variants", () => {
  beforeEach(() => mockedSatori.mockClear());

  it.each(["dusk", "ridge", "journal"] as const)(
    "renders the %s Location palette and cover layout",
    async (preset) => {
      await renderLocationPoster({
        title: "West Lake Trail",
        description: "A scenic walk",
        tags: [],
        fonts: [],
        preset,
      });

      const tree = renderedTree();
      expect(tree.props.style.backgroundColor).toBe(POSTER_PRESETS[preset].palette.bg);
      expect(tree.props.children[0].props.style.height).toBe(
        POSTER_PRESETS[preset].location.coverHeight,
      );
      expect(tree.props.children[1].props.style.borderRadius).toBe(
        POSTER_PRESETS[preset].location.cardRadius,
      );
    },
  );

  it.each(["dusk", "ridge", "journal"] as const)(
    "renders the %s Team palette and hierarchy",
    async (preset) => {
      await renderTeamPoster({
        title: "Sunday Hiking Team",
        date: "2026-08-30",
        coverImage: "https://example.com/cover.jpg",
        activeParticipantCount: 3,
        maxParticipants: 6,
        fonts: [],
        preset,
      });

      const tree = renderedTree();
      expect(tree.props.style.backgroundColor).toBe(POSTER_PRESETS[preset].palette.bg);
      expect(tree.props.children[0].props.style.height).toBe(
        POSTER_PRESETS[preset].team.coverHeight,
      );
      expect(tree.props.children[1].props.style.borderRadius).toBe(
        POSTER_PRESETS[preset].team.cardRadius,
      );
    },
  );

  it.each(["dusk", "ridge", "journal"] as const)(
    "keeps the %s Team fallback header within its fixed layout",
    async (preset) => {
      await renderTeamPoster({
        title: "Sunday Hiking Team",
        date: "2026-08-30",
        activeParticipantCount: 3,
        maxParticipants: 6,
        fonts: [],
        preset,
      });

      expect(renderedTree().props.children[0].props.style.height).toBe(
        POSTER_PRESETS[preset].team.emptyCoverHeight,
      );
    },
  );
});
