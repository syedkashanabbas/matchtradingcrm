'use client';

import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * The "ramificazione": every person below you, branch by branch.
 * Levels 1-3 earn commissions (Exonoma plan); deeper levels are shown too
 * so the whole organisation stays visible.
 */

export interface TreeNode {
  id: string;
  name: string;
  level: number;
  status: string;
  children: TreeNode[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success border-success/25',
  ONBOARDING: 'bg-primary/10 text-primary border-primary/20',
  SUSPENDED: 'bg-warning/15 text-warning border-warning/25',
  INACTIVE: 'bg-destructive/10 text-destructive border-destructive/20',
  NEW: 'bg-primary/10 text-primary border-primary/20',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'active',
  ONBOARDING: 'onboarding',
  SUSPENDED: 'suspended',
  INACTIVE: 'expired',
  NEW: 'new',
};

const LEVEL_RATES: Record<number, string> = { 1: '20%', 2: '18%', 3: '12%' };

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2); // levels 1-2 open by default
  const hasChildren = node.children.length > 0;
  const descendants = countDescendants(node);
  const initials = node.name
    .split(' ')
    .map(part => part.charAt(0))
    .slice(0, 2)
    .join('');

  return (
    <li className="animate-grow-in">
      <div
        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/60 ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasChildren && setOpen(!open)}
        role={hasChildren ? 'button' : undefined}
        aria-expanded={hasChildren ? open : undefined}
      >
        {/* Expand chevron / leaf dot */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
            />
          ) : (
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-border" />
          )}
        </span>

        {/* Avatar */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            node.level <= 3 ? 'bg-exo-verdigris' : 'bg-exo-sumi'
          }`}
        >
          {initials}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{node.name}</p>
          <p className="text-xs text-muted-foreground">
            Level {node.level}
            {LEVEL_RATES[node.level] && (
              <span className="ml-1.5 font-semibold text-exo-verdigris">· {LEVEL_RATES[node.level]} for you</span>
            )}
            {hasChildren && (
              <span className="ml-1.5">
                · {descendants} below
              </span>
            )}
          </p>
        </div>

        <Badge variant="outline" className={`shrink-0 ${STATUS_STYLES[node.status] ?? ''}`}>
          {STATUS_LABELS[node.status] ?? node.status.toLowerCase()}
        </Badge>
      </div>

      {/* Children with connector line */}
      {hasChildren && open && (
        <ul className="ml-[21px] space-y-0.5 border-l-2 border-exo-verdigris-soft pl-3">
          {node.children.map(child => (
            <TreeBranch key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NetworkTree({ tree }: { tree: TreeNode | null }) {
  if (!tree || tree.children.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-exo-verdigris-soft">
          <Users className="h-7 w-7 text-exo-verdigris" />
        </div>
        <p className="font-medium text-foreground">Your tree starts with one invite</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Everyone who joins with your link appears here, branch by branch, three earning levels deep.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {tree.children.map(child => (
        <TreeBranch key={child.id} node={child} depth={1} />
      ))}
    </ul>
  );
}
