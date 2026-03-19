export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

export interface TerminalTreeNode {
  id: string;
  name: string;
}
