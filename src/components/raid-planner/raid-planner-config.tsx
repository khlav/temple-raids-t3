"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { RAID_ZONE_CONFIG } from "~/lib/raid-zones";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  FolderOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { AATemplateEditorDialog } from "./aa-template-editor-dialog";
import { getGroupCount } from "./constants";

interface TemplateEncounter {
  id: string;
  templateId: string;
  encounterKey: string;
  encounterName: string;
  sortOrder: number;
  groupId: string | null;
  aaTemplate: string | null;
}

interface TemplateEncounterGroup {
  id: string;
  templateId: string;
  groupName: string;
  sortOrder: number;
}

interface Template {
  id: string;
  zoneId: string;
  zoneName: string;
  defaultGroupCount: number;
  isActive: boolean;
  sortOrder: number;
  defaultAATemplate: string | null;
  encounters: TemplateEncounter[];
  encounterGroups: TemplateEncounterGroup[];
}

interface ZoneRow {
  name: string;
  instance: string;
  template: Template | null;
}

export function RaidPlannerConfig() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: templates, isLoading } = api.raidPlanTemplate.getAll.useQuery();

  // Merge RAID_ZONE_CONFIG with fetched templates
  const zones: ZoneRow[] = RAID_ZONE_CONFIG.map((zone) => {
    const template = templates?.find((t) => t.zoneId === zone.instance) ?? null;
    return {
      name: zone.name,
      instance: zone.instance,
      template,
    };
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {zones.map((zone) => (
        <ZoneAccordionItem key={zone.instance} zone={zone} />
      ))}
    </Accordion>
  );

  function ZoneAccordionItem({ zone }: { zone: ZoneRow }) {
    const [newEncounterName, setNewEncounterName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [deleteEncounterId, setDeleteEncounterId] = useState<string | null>(
      null,
    );
    const [newGroupName, setNewGroupName] = useState("");
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState("");
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    // AA dialog state
    const [aaDialogContext, setAADialogContext] = useState<{
      type: "default" | "encounter";
      encounterId?: string;
      label: string;
      currentTemplate: string;
    } | null>(null);

    const defaultGroupCount = getGroupCount(zone.instance);
    const is20Man = defaultGroupCount === 4;
    const encounterCount = zone.template?.encounters.length ?? 0;

    const upsertTemplate = api.raidPlanTemplate.upsertTemplate.useMutation({
      onSuccess: () => {
        void utils.raidPlanTemplate.getAll.invalidate();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    const updateTemplate = api.raidPlanTemplate.updateTemplate.useMutation({
      onMutate: async (variables) => {
        await utils.raidPlanTemplate.getAll.cancel();
        const previous = utils.raidPlanTemplate.getAll.getData();
        utils.raidPlanTemplate.getAll.setData(undefined, (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id === variables.templateId
              ? {
                  ...t,
                  ...(variables.isActive !== undefined && {
                    isActive: variables.isActive,
                  }),
                  ...(variables.sortOrder !== undefined && {
                    sortOrder: variables.sortOrder,
                  }),
                  ...(variables.defaultGroupCount !== undefined && {
                    defaultGroupCount: variables.defaultGroupCount,
                  }),
                  ...(variables.defaultAATemplate !== undefined && {
                    defaultAATemplate: variables.defaultAATemplate,
                  }),
                }
              : t,
          );
        });
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          utils.raidPlanTemplate.getAll.setData(undefined, context.previous);
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onSettled: () => {
        void utils.raidPlanTemplate.getAll.invalidate();
      },
    });

    const addEncounter = api.raidPlanTemplate.addEncounter.useMutation({
      onMutate: async (variables) => {
        await utils.raidPlanTemplate.getAll.cancel();
        const previous = utils.raidPlanTemplate.getAll.getData();
        const tempId = crypto.randomUUID();
        const encounterKey = variables.encounterName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        utils.raidPlanTemplate.getAll.setData(undefined, (old) => {
          if (!old) return old;
          return old.map((t) => {
            if (t.id !== variables.templateId) return t;
            const maxSort = t.encounters.reduce(
              (m, e) => Math.max(m, e.sortOrder),
              -1,
            );
            return {
              ...t,
              encounters: [
                ...t.encounters,
                {
                  id: tempId,
                  templateId: variables.templateId,
                  encounterKey,
                  encounterName: variables.encounterName,
                  sortOrder: maxSort + 1,
                  groupId: variables.groupId ?? null,
                  aaTemplate: null,
                  includeAAByDefault: false,
                },
              ],
            };
          });
        });
        setNewEncounterName("");
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          utils.raidPlanTemplate.getAll.setData(undefined, context.previous);
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onSettled: () => {
        void utils.raidPlanTemplate.getAll.invalidate();
      },
    });

    const updateEncounter = api.raidPlanTemplate.updateEncounter.useMutation({
      onMutate: async (variables) => {
        await utils.raidPlanTemplate.getAll.cancel();
        const previous = utils.raidPlanTemplate.getAll.getData();
        utils.raidPlanTemplate.getAll.setData(undefined, (old) => {
          if (!old) return old;
          return old.map((t) => ({
            ...t,
            encounters: t.encounters.map((e) => {
              if (e.id !== variables.encounterId) return e;
              return {
                ...e,
                ...(variables.encounterName !== undefined && {
                  encounterName: variables.encounterName,
                  encounterKey: variables.encounterName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                }),
                ...(variables.sortOrder !== undefined && {
                  sortOrder: variables.sortOrder,
                }),
                ...(variables.aaTemplate !== undefined && {
                  aaTemplate: variables.aaTemplate,
                }),
              };
            }),
          }));
        });
        setEditingId(null);
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          utils.raidPlanTemplate.getAll.setData(undefined, context.previous);
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onSettled: () => {
        void utils.raidPlanTemplate.getAll.invalidate();
      },
    });

    const deleteEncounter = api.raidPlanTemplate.deleteEncounter.useMutation({
      onMutate: async (variables) => {
        await utils.raidPlanTemplate.getAll.cancel();
        const previous = utils.raidPlanTemplate.getAll.getData();
        utils.raidPlanTemplate.getAll.setData(undefined, (old) => {
          if (!old) return old;
          return old.map((t) => ({
            ...t,
            encounters: t.encounters.filter(
              (e) => e.id !== variables.encounterId,
            ),
          }));
        });
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          utils.raidPlanTemplate.getAll.setData(undefined, context.previous);
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onSettled: () => {
        void utils.raidPlanTemplate.getAll.invalidate();
      },
    });

    const reorderEncounters =
      api.raidPlanTemplate.reorderEncounters.useMutation({
        onMutate: async (variables) => {
          await utils.raidPlanTemplate.getAll.cancel();
          const previous = utils.raidPlanTemplate.getAll.getData();
          const orderMap = new Map(
            variables.encounters.map((e) => [e.id, e.sortOrder]),
          );
          utils.raidPlanTemplate.getAll.setData(undefined, (old) => {
            if (!old) return old;
            return old.map((t) => ({
              ...t,
              encounters: t.encounters.map((e) => {
                const newOrder = orderMap.get(e.id);
                return newOrder !== undefined
                  ? { ...e, sortOrder: newOrder }
                  : e;
              }),
            }));
          });
          return { previous };
        },
        onError: (error, _variables, context) => {
          if (context?.previous) {
            utils.raidPlanTemplate.getAll.setData(undefined, context.previous);
          }
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
        onSettled: () => {
          void utils.raidPlanTemplate.getAll.invalidate();
        },
      });

    const createGroup =
      api.raidPlanTemplate.createTemplateEncounterGroup.useMutation({
        onSuccess: () => void utils.raidPlanTemplate.getAll.invalidate(),
        onError: (error) =>
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          }),
      });

    const updateGroup =
      api.raidPlanTemplate.updateTemplateEncounterGroup.useMutation({
        onSuccess: () => void utils.raidPlanTemplate.getAll.invalidate(),
        onError: (error) =>
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          }),
      });

    const deleteGroup =
      api.raidPlanTemplate.deleteTemplateEncounterGroup.useMutation({
        onSuccess: () => void utils.raidPlanTemplate.getAll.invalidate(),
        onError: (error) =>
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          }),
      });

    const handleAddEncounter = async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newEncounterName.trim();
      if (!name) return;

      if (zone.template) {
        // Template already exists, just add the encounter
        addEncounter.mutate({
          templateId: zone.template.id,
          encounterName: name,
        });
      } else {
        // Create the template first, then add the encounter
        upsertTemplate.mutate(
          {
            zoneId: zone.instance,
            zoneName: zone.name,
            defaultGroupCount,
            isActive: true,
            sortOrder: RAID_ZONE_CONFIG.findIndex(
              (z) => z.instance === zone.instance,
            ),
          },
          {
            onSuccess: (data) => {
              addEncounter.mutate({
                templateId: data.id,
                encounterName: name,
              });
            },
          },
        );
      }
    };

    const handleToggleActive = (checked: boolean) => {
      if (!zone.template) return;
      updateTemplate.mutate({
        templateId: zone.template.id,
        isActive: checked,
      });
    };

    const handleMoveEncounterInList = (
      encounter: TemplateEncounter,
      direction: "up" | "down",
      list: TemplateEncounter[],
    ) => {
      const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((e) => e.id === encounter.id);
      if (
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === sorted.length - 1)
      ) {
        return;
      }
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      const updated = sorted.map((e, i) => {
        if (i === idx)
          return { id: e.id, sortOrder: sorted[swapIdx]!.sortOrder };
        if (i === swapIdx)
          return { id: e.id, sortOrder: sorted[idx]!.sortOrder };
        return { id: e.id, sortOrder: e.sortOrder };
      });
      reorderEncounters.mutate({ encounters: updated });
    };

    const handleRenameSubmit = (encounterId: string) => {
      const name = editingName.trim();
      if (!name) return;
      updateEncounter.mutate({ encounterId, encounterName: name });
    };

    const handleDeleteConfirm = () => {
      if (!deleteEncounterId) return;
      deleteEncounter.mutate({ encounterId: deleteEncounterId });
      setDeleteEncounterId(null);
    };

    const handleAADialogSave = (template: string) => {
      if (!zone.template || !aaDialogContext) return;

      if (aaDialogContext.type === "default") {
        updateTemplate.mutate(
          {
            templateId: zone.template.id,
            defaultAATemplate: template || null,
          },
          {
            onSuccess: () => setAADialogContext(null),
          },
        );
      } else if (aaDialogContext.encounterId) {
        updateEncounter.mutate(
          {
            encounterId: aaDialogContext.encounterId,
            aaTemplate: template || null,
          },
          {
            onSuccess: () => setAADialogContext(null),
          },
        );
      }
    };

    const handleAADialogClear = () => {
      if (!zone.template || !aaDialogContext) return;

      if (aaDialogContext.type === "default") {
        updateTemplate.mutate(
          {
            templateId: zone.template.id,
            defaultAATemplate: null,
          },
          {
            onSuccess: () => setAADialogContext(null),
          },
        );
      } else if (aaDialogContext.encounterId) {
        updateEncounter.mutate(
          {
            encounterId: aaDialogContext.encounterId,
            aaTemplate: null,
          },
          {
            onSuccess: () => setAADialogContext(null),
          },
        );
      }
    };

    const handleAddGroup = (e: React.FormEvent) => {
      e.preventDefault();
      const name = newGroupName.trim();
      if (!name || !zone.template) return;
      createGroup.mutate({ templateId: zone.template.id, groupName: name });
      setNewGroupName("");
    };

    const handleRenameGroupSubmit = (groupId: string) => {
      const name = editingGroupName.trim();
      if (!name) return;
      updateGroup.mutate({ groupId, groupName: name });
      setEditingGroupId(null);
    };

    const handleDeleteGroupConfirm = (mode: "promote" | "deleteChildren") => {
      if (!deleteGroupId) return;
      deleteGroup.mutate({ groupId: deleteGroupId, mode });
      setDeleteGroupId(null);
    };

    const handleEncounterGroupChange = (
      encounterId: string,
      newGroupId: string | null,
    ) => {
      const enc = sortedEncounters.find((e) => e.id === encounterId);
      if (!enc) return;
      reorderEncounters.mutate({
        encounters: [
          { id: encounterId, sortOrder: enc.sortOrder, groupId: newGroupId },
        ],
      });
    };

    const sortedGroups = zone.template
      ? [...zone.template.encounterGroups].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )
      : [];

    const sortedEncounters = zone.template
      ? [...zone.template.encounters].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];

    // Build display: interleave groups and ungrouped encounters by sortOrder
    type DisplayGroup = {
      kind: "group";
      group: TemplateEncounterGroup;
      encounters: TemplateEncounter[];
    };
    type DisplayEnc = { kind: "encounter"; encounter: TemplateEncounter };
    type DisplayItem = DisplayGroup | DisplayEnc;

    const groupIds = new Set(sortedGroups.map((g) => g.id));
    const ungroupedEncs = sortedEncounters.filter(
      (e) => !e.groupId || !groupIds.has(e.groupId),
    );
    const byGroup = new Map<string, TemplateEncounter[]>(
      sortedGroups.map((g) => [g.id, []]),
    );
    for (const enc of sortedEncounters) {
      if (enc.groupId && byGroup.has(enc.groupId)) {
        byGroup.get(enc.groupId)!.push(enc);
      }
    }
    const displayItems: DisplayItem[] = [
      ...ungroupedEncs.map((e) => ({
        kind: "encounter" as const,
        encounter: e,
        sortOrder: e.sortOrder,
      })),
      ...sortedGroups.map((g) => ({
        kind: "group" as const,
        group: g,
        encounters: byGroup.get(g.id) ?? [],
        sortOrder: g.sortOrder,
      })),
    ]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _so, ...rest }) => rest as DisplayItem);

    return (
      <>
        <AccordionItem value={zone.instance}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-1 items-center gap-3">
              <span className="text-base font-semibold">{zone.name}</span>
              <span className="text-xs text-muted-foreground">
                {defaultGroupCount} groups, {is20Man ? "20" : "40"}-man
              </span>
              {zone.template ? (
                <Badge variant="secondary">
                  {encounterCount} encounter{encounterCount !== 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not configured
                </Badge>
              )}
              <div className="ml-auto mr-2 flex items-center gap-2">
                {zone.template && (
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label
                      htmlFor={`active-${zone.instance}`}
                      className="text-xs text-muted-foreground"
                    >
                      Active
                    </Label>
                    <Switch
                      id={`active-${zone.instance}`}
                      checked={zone.template.isActive}
                      onCheckedChange={handleToggleActive}
                      disabled={updateTemplate.isPending}
                    />
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Syntax help */}
              <p className="text-xs text-muted-foreground">
                Use{" "}
                <code className="rounded bg-muted px-1">
                  {"{assign:SlotName}"}
                </code>{" "}
                to create assignment slots in AA templates. Use{" "}
                <code className="rounded bg-muted px-1">
                  {"{ref:SlotName}"}
                </code>{" "}
                to mirror a slot (read-only).
              </p>

              {/* Unified encounter list */}
              <div className="max-w-xl space-y-2">
                {/* Default/Trash row */}
                <div className="rounded-md border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-14" />
                    <span className="flex-1 text-sm text-muted-foreground">
                      Default/Trash
                    </span>
                    <Button
                      variant={
                        zone.template?.defaultAATemplate ? "default" : "warning"
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setAADialogContext({
                          type: "default",
                          label: "Default/Trash",
                          currentTemplate:
                            zone.template?.defaultAATemplate ?? "",
                        })
                      }
                    >
                      {zone.template?.defaultAATemplate ? "Edit AA" : "Add AA"}
                    </Button>
                    <div className="w-7" />
                  </div>
                </div>

                {/* Groups and ungrouped encounters interleaved by sortOrder */}
                {displayItems.map((item) =>
                  item.kind === "group" ? (
                    <div
                      key={item.group.id}
                      className="overflow-hidden rounded-md border"
                    >
                      {/* Group header */}
                      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {editingGroupId === item.group.id ? (
                          <>
                            <Input
                              value={editingGroupName}
                              onChange={(e) =>
                                setEditingGroupName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameGroupSubmit(item.group.id);
                                else if (e.key === "Escape")
                                  setEditingGroupId(null);
                              }}
                              className="h-7 flex-1"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleRenameGroupSubmit(item.group.id)
                              }
                              disabled={updateGroup.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingGroupId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">
                              {item.group.groupName}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingGroupId(item.group.id);
                                setEditingGroupName(item.group.groupName);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteGroupId(item.group.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Encounters inside this group */}
                      {item.encounters.length === 0 ? (
                        <p className="px-3 py-2 text-xs italic text-muted-foreground">
                          No encounters assigned to this group
                        </p>
                      ) : (
                        <div className="divide-y">
                          {item.encounters.map((encounter, encIdx) => (
                            <div
                              key={encounter.id}
                              className="flex items-center gap-2 px-3 py-2"
                            >
                              <div className="flex">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={
                                    encIdx === 0 || reorderEncounters.isPending
                                  }
                                  onClick={() =>
                                    handleMoveEncounterInList(
                                      encounter,
                                      "up",
                                      item.encounters,
                                    )
                                  }
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={
                                    encIdx === item.encounters.length - 1 ||
                                    reorderEncounters.isPending
                                  }
                                  onClick={() =>
                                    handleMoveEncounterInList(
                                      encounter,
                                      "down",
                                      item.encounters,
                                    )
                                  }
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {editingId === encounter.id ? (
                                <>
                                  <Input
                                    value={editingName}
                                    onChange={(e) =>
                                      setEditingName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleRenameSubmit(encounter.id);
                                      else if (e.key === "Escape")
                                        setEditingId(null);
                                    }}
                                    className="h-7 flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      handleRenameSubmit(encounter.id)
                                    }
                                    disabled={updateEncounter.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="min-w-0 flex-1 truncate text-sm">
                                    {encounter.encounterName}
                                  </span>
                                  {sortedGroups.length > 0 && (
                                    <Select
                                      value={encounter.groupId ?? "none"}
                                      onValueChange={(v) =>
                                        handleEncounterGroupChange(
                                          encounter.id,
                                          v === "none" ? null : v,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-7 w-28 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          No group
                                        </SelectItem>
                                        {sortedGroups.map((g) => (
                                          <SelectItem key={g.id} value={g.id}>
                                            {g.groupName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingId(encounter.id);
                                      setEditingName(encounter.encounterName);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant={
                                      encounter.aaTemplate
                                        ? "default"
                                        : "warning"
                                    }
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      setAADialogContext({
                                        type: "encounter",
                                        encounterId: encounter.id,
                                        label: encounter.encounterName,
                                        currentTemplate:
                                          encounter.aaTemplate ?? "",
                                      })
                                    }
                                  >
                                    {encounter.aaTemplate
                                      ? "Edit AA"
                                      : "Add AA"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      setDeleteEncounterId(encounter.id)
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Ungrouped encounter */
                    <div key={item.encounter.id} className="rounded-md border">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={
                              ungroupedEncs.findIndex(
                                (e) => e.id === item.encounter.id,
                              ) === 0 || reorderEncounters.isPending
                            }
                            onClick={() =>
                              handleMoveEncounterInList(
                                item.encounter,
                                "up",
                                ungroupedEncs,
                              )
                            }
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={
                              ungroupedEncs.findIndex(
                                (e) => e.id === item.encounter.id,
                              ) ===
                                ungroupedEncs.length - 1 ||
                              reorderEncounters.isPending
                            }
                            onClick={() =>
                              handleMoveEncounterInList(
                                item.encounter,
                                "down",
                                ungroupedEncs,
                              )
                            }
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {editingId === item.encounter.id ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameSubmit(item.encounter.id);
                                else if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-7 flex-1"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleRenameSubmit(item.encounter.id)
                              }
                              disabled={updateEncounter.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {item.encounter.encounterName}
                            </span>
                            {sortedGroups.length > 0 && (
                              <Select
                                value="none"
                                onValueChange={(v) =>
                                  handleEncounterGroupChange(
                                    item.encounter.id,
                                    v === "none" ? null : v,
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No group</SelectItem>
                                  {sortedGroups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.groupName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingId(item.encounter.id);
                                setEditingName(item.encounter.encounterName);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant={
                                item.encounter.aaTemplate
                                  ? "default"
                                  : "warning"
                              }
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setAADialogContext({
                                  type: "encounter",
                                  encounterId: item.encounter.id,
                                  label: item.encounter.encounterName,
                                  currentTemplate:
                                    item.encounter.aaTemplate ?? "",
                                })
                              }
                            >
                              {item.encounter.aaTemplate ? "Edit AA" : "Add AA"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteEncounterId(item.encounter.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* Add encounter + Add group forms */}
              <div className="flex flex-col gap-2 pt-2">
                <form
                  onSubmit={handleAddEncounter}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Encounter name"
                    value={newEncounterName}
                    onChange={(e) => setNewEncounterName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={
                      !newEncounterName.trim() ||
                      addEncounter.isPending ||
                      upsertTemplate.isPending
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Encounter
                  </Button>
                </form>
                {zone.template && (
                  <form
                    onSubmit={handleAddGroup}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="Group name (e.g. Spider Wing)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="h-8 flex-1"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      disabled={!newGroupName.trim() || createGroup.isPending}
                    >
                      <FolderOpen className="mr-1 h-3.5 w-3.5" />
                      Add Group
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!deleteEncounterId}
          onOpenChange={(open) => {
            if (!open) setDeleteEncounterId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete encounter</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this encounter from the
                template? This will not affect existing raid plans.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Group delete confirmation dialog */}
        <AlertDialog
          open={!!deleteGroupId}
          onOpenChange={(open) => {
            if (!open) setDeleteGroupId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete group</AlertDialogTitle>
              <AlertDialogDescription>
                What should happen to encounters in this group?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteGroupConfirm("promote")}
              >
                Move encounters to top-level
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => handleDeleteGroupConfirm("deleteChildren")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete encounters too
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AA template config dialog */}
        <AATemplateEditorDialog
          open={!!aaDialogContext}
          onOpenChange={(open) => {
            if (!open) setAADialogContext(null);
          }}
          contextLabel={aaDialogContext?.label ?? ""}
          zoneName={zone.name}
          initialTemplate={aaDialogContext?.currentTemplate ?? ""}
          hasExistingTemplate={!!aaDialogContext?.currentTemplate}
          onSave={handleAADialogSave}
          onClear={handleAADialogClear}
          isSaving={updateTemplate.isPending || updateEncounter.isPending}
        />
      </>
    );
  }
}
