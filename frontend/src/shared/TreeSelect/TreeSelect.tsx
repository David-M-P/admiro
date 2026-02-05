// Import statements remain the same
import { TreeData } from "@/assets/treeData";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import GroupIcon from "@mui/icons-material/Group";
import MailIcon from "@mui/icons-material/Mail";
import MapIcon from "@mui/icons-material/Map";
import PersonIcon from "@mui/icons-material/Person";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import { SvgIconProps } from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import {
  TreeItem2Content,
  TreeItem2GroupTransition,
  TreeItem2IconContainer,
  TreeItem2Root,
} from "@mui/x-tree-view/TreeItem2";
import { TreeItem2Icon } from "@mui/x-tree-view/TreeItem2Icon";
import { TreeItem2Provider } from "@mui/x-tree-view/TreeItem2Provider";
import {
  useTreeItem2,
  UseTreeItem2Parameters,
} from "@mui/x-tree-view/useTreeItem2";
import clsx from "clsx";
import React, { useCallback, useMemo, useState } from "react";

// CustomTreeItem component
const CustomTreeItemRoot = styled(TreeItem2Root)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

// Helper function to count selected children for each node
const countSelectedChildren = (node: any, selectedItems: string[]): number => {
  if (!node.children) return selectedItems.includes(node.id) ? 1 : 0;
  let count = 0;
  node.children.forEach((child: any) => {
    count += countSelectedChildren(child, selectedItems);
  });
  return count;
};

// Helper function to count total terminal descendants under a node
const countTerminalDescendants = (node: any): number => {
  if (!node.children) return 1; // Terminal node
  let count = 0;
  node.children.forEach((child: any) => {
    count += countTerminalDescendants(child);
  });
  return count;
};

const CustomTreeItemContent = styled(TreeItem2Content)(({ theme }) => ({
  marginBottom: theme.spacing(0.3),
  color: theme.palette.text.secondary,
  borderRadius: theme.spacing(2),
  paddingRight: theme.spacing(1),
  fontWeight: theme.typography.fontWeightMedium,
  "&.expanded": {
    fontWeight: theme.typography.fontWeightRegular,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "&.focused, &.selected, &.selected.focused": {
    backgroundColor: `var(--tree-view-bg-color, ${theme.palette.action.selected})`,
    color: "var(--tree-view-color)",
  },
}));

const CustomTreeItemIconContainer = styled(TreeItem2IconContainer)(
  ({ theme }) => ({
    marginRight: theme.spacing(1),
  })
);

const CustomTreeItemGroupTransition = styled(TreeItem2GroupTransition)(
  ({ theme }) => ({
    marginLeft: 0,
    [`& .content`]: {
      paddingLeft: theme.spacing(2),
    },
  })
);

// Helper function to get appropriate icon for node levels
const getIconForLevel = (nodeId: string) => {

  if (nodeId.includes("pop")) {
    return GroupIcon;
  }
  if (nodeId.includes("reg")) {
    return MapIcon;
  }
  if (nodeId.includes("oda")) {
    return FolderIcon;
  }
  if (nodeId.includes("dat")) {
    return MailIcon;
  }
  if (nodeId.includes("parent")) {
    return AccountTreeIcon;
  }
  // fallback
  return PersonIcon;
};

// Helper function to determine if a node is terminal (has no children)
const isTerminalNode = (nodeId: string, treeData: any[]) => {
  const findNodeById = (id: string, nodes: any[]): boolean => {
    for (const node of nodes) {
      if (node.id === id) {
        return !node.children; // Return true if no children (terminal node)
      }
      if (node.children) {
        const foundInChild = findNodeById(id, node.children);
        if (foundInChild) return foundInChild;
      }
    }
    return false;
  };
  return findNodeById(nodeId, treeData);
};

// Helper function to find a node by ID
const findNodeById = (id: string, nodes: any[]): any | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(id, node.children);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to get all terminal descendants under a node
const getAllTerminalDescendants = (node: any): string[] => {
  if (!node.children) return [node.id];
  let ids: string[] = [];
  node.children.forEach((child: any) => {
    ids = ids.concat(getAllTerminalDescendants(child));
  });
  return ids;
};

// Update CustomTreeItem component
const CustomTreeItem = React.memo(
  React.forwardRef(function CustomTreeItem(
    props: UseTreeItem2Parameters & {
      labelIcon: React.ElementType<SvgIconProps>;
      selectedChildrenCount: number;
      totalTerminalDescendants: number;
      onNodeSelectToggle: (nodeId: string) => void;
      isRoot: boolean; // Add isRoot prop
    },
    ref: React.Ref<HTMLLIElement>
  ) {
    const {
      id,
      itemId,
      label,
      children,
      labelIcon: LabelIcon,
      selectedChildrenCount,
      totalTerminalDescendants,
      onNodeSelectToggle,
      isRoot, // Destructure isRoot
    } = props;
    const {
      getRootProps,
      getContentProps,
      getIconContainerProps,
      getLabelProps,
      getGroupTransitionProps,
      status,
    } = useTreeItem2({ id, itemId, children, label, rootRef: ref });

    const isTerminal = !children;

    // Determine selection state
    let selectionState: "empty" | "partial" | "full" = "empty";
    if (selectedChildrenCount === 0) {
      selectionState = "empty";
    } else if (selectedChildrenCount === totalTerminalDescendants) {
      selectionState = "full";
    } else {
      selectionState = "partial";
    }

    return (
      <TreeItem2Provider itemId={itemId}>
        <CustomTreeItemRoot {...getRootProps()}>
          <CustomTreeItemContent
            {...getContentProps({
              className: clsx("content", {
                expanded: status.expanded,
                selected: status.selected,
                focused: status.focused,
              }),
            })}
          >
            <CustomTreeItemIconContainer {...getIconContainerProps()}>
              <TreeItem2Icon status={status} />
            </CustomTreeItemIconContainer>
            <Box
              sx={{
                display: "flex",
                flexGrow: 1,
                alignItems: "center",
                p: 0.5,
                pr: 0,
              }}
            >
              {/* Conditionally render the checkbox */}
              {!isTerminal && !isRoot && (
                <Checkbox
                  edge="start"
                  checked={selectionState === "full"}
                  indeterminate={selectionState === "partial"}
                  tabIndex={-1}
                  disableRipple
                  onClick={(event) => {
                    event.stopPropagation(); // Prevent click from propagating
                    onNodeSelectToggle(itemId);
                  }}
                />
              )}
              {/* Add spacing to align items when the checkbox is not rendered */}
              {isRoot && !isTerminal && (
                <Box sx={{ width: 24, display: "inline-block" }} />
              )}
              <Box component={LabelIcon} sx={{ mr: 1 }} />
              <Typography
                {...getLabelProps({ variant: "body2", sx: { flexGrow: 1 } })}
              >
                {label}
              </Typography>
              {/* Display the count of selected children */}
              {selectedChildrenCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{ ml: 1, color: "text.secondary" }}
                >
                  ({selectedChildrenCount})
                </Typography>
              )}
            </Box>
          </CustomTreeItemContent>
          {children && (
            <CustomTreeItemGroupTransition {...getGroupTransitionProps()}>
              {children}
            </CustomTreeItemGroupTransition>
          )}
        </CustomTreeItemRoot>
      </TreeItem2Provider>
    );
  })
);

// Recursive function to render tree items and pass selectedChildrenCount and totalTerminalDescendants
const renderTreeItems = (
  nodes: any,
  selectedItems: string[],
  handleNodeSelectToggle: (nodeId: string) => void,
  level: number = 0 // Add level parameter with default value 0
) => {
  return nodes.map((node: any) => {
    const selectedChildrenCount = countSelectedChildren(node, selectedItems);
    const totalTerminalDescendants = countTerminalDescendants(node);
    const isRoot = level === 0; // Determine if the node is the root

    return (
      <CustomTreeItem
        key={node.id}
        itemId={node.id}
        label={node.name}
        labelIcon={getIconForLevel(node.id)}
        selectedChildrenCount={selectedChildrenCount}
        totalTerminalDescendants={totalTerminalDescendants}
        onNodeSelectToggle={handleNodeSelectToggle}
        isRoot={isRoot} // Pass isRoot to CustomTreeItem
      >
        {node.children
          ? renderTreeItems(
            node.children,
            selectedItems,
            handleNodeSelectToggle,
            level + 1 // Increment level for child nodes
          )
          : null}
      </CustomTreeItem>
    );
  });
};

export function GmailTreeView({
  selectedItems,
  onSelectedItemsChange,
}: {
  selectedItems: string[];
  onSelectedItemsChange: (selectedItems: string[]) => void;
}) {
  const handleNodeSelectToggle = useCallback(
    (nodeId: string) => {
      const node = findNodeById(nodeId, TreeData);
      if (node) {
        const terminalDescendants = getAllTerminalDescendants(node);
        const anySelected = terminalDescendants.some((id) =>
          selectedItems.includes(id)
        );
        let newSelectedItems: string[];
        if (anySelected) {
          // Deselect all terminal descendants
          newSelectedItems = selectedItems.filter(
            (id) => !terminalDescendants.includes(id)
          );
        } else {
          // Select all terminal descendants
          newSelectedItems = [
            ...new Set([...selectedItems, ...terminalDescendants]),
          ];
        }
        onSelectedItemsChange(newSelectedItems);
      }
    },
    [selectedItems, onSelectedItemsChange]
  );

  const handleSelectionChange = useCallback(
    (newSelectedItems: string[]) => {
      // Filter the selection to ensure only terminal nodes are selected
      const validSelections = newSelectedItems.filter((id) =>
        isTerminalNode(id, TreeData)
      );
      // Merge new selections with previous ones
      const newSelections = [
        ...new Set([...selectedItems, ...validSelections]),
      ];
      onSelectedItemsChange(newSelections);
    },
    [onSelectedItemsChange, selectedItems]
  );

  const memoizedTreeItems = useMemo(
    () => renderTreeItems(TreeData, selectedItems, handleNodeSelectToggle),
    [selectedItems, handleNodeSelectToggle]
  );

  return (
    <SimpleTreeView
      aria-label="gmail"
      defaultExpandedItems={[]}
      selectedItems={selectedItems}
      onSelectedItemsChange={(_, newSelectedItems) =>
        handleSelectionChange(newSelectedItems)
      }
      multiSelect
      slots={{
        expandIcon: ArrowRightIcon,
        collapseIcon: ArrowDropDownIcon,
        endIcon: () => <div style={{ width: 24 }} />,
      }}
      sx={{ flexGrow: 1, maxWidth: 400 }}
    >
      {memoizedTreeItems}
    </SimpleTreeView>
  );
}

// Helper function to extract terminal nodes
const getTerminalNodes = (nodes: any): { id: string; name: string }[] => {
  let terminalNodes: { id: string; name: string }[] = [];
  nodes.forEach((node: any) => {
    if (!node.children) {
      terminalNodes.push({ id: node.id, name: node.name });
    } else {
      terminalNodes = [...terminalNodes, ...getTerminalNodes(node.children)];
    }
  });
  return terminalNodes;
};

export function GmailTreeViewWithText({
  selectedItems,
  onSelectedItemsChange,
}: {
  selectedItems: string[];
  onSelectedItemsChange: (selectedItems: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState(""); // State for input text
  const terminalNodes = useMemo(() => getTerminalNodes(TreeData), []); // Memoize terminal nodes

  // Memoize filtered options to prevent excessive recalculations
  const filteredOptions = useMemo(
    () => (inputValue.length >= 4 ? terminalNodes : []),
    [inputValue, terminalNodes]
  );

  const handleAutocompleteChange = useCallback(
    (event: any, newSelected: { id: string; name: string }[]) => {
      const selectedIds = newSelected.map((node) => node.id);
      const newSelections = [...new Set([...selectedItems, ...selectedIds])]; // Merge with current selections
      onSelectedItemsChange(newSelections); // Add selected IDs to existing selectedItems
      setInputValue(""); // Clear the input field
    },
    [onSelectedItemsChange, selectedItems]
  );

  const handleInputChange = useCallback(
    (event: any, newInputValue: string, reason: string) => {
      // Ignore resets triggered by MUI, only handle normal changes
      if (reason !== "reset") {
        setInputValue(newInputValue);
      }
    },
    []
  );

  const handleDelete = useCallback(
    (nodeId: string) => {
      const newSelectedItems = selectedItems.filter((id) => id !== nodeId);
      onSelectedItemsChange(newSelectedItems); // Update selected items without the deleted one
    },
    [selectedItems, onSelectedItemsChange]
  );

  const handleTreeSelectionChange = useCallback(
    (newSelectedItems: string[]) => {
      // Filter the selection to ensure only terminal nodes are selected
      const validSelections = newSelectedItems.filter((id) =>
        isTerminalNode(id, TreeData)
      );
      const newSelections = [
        ...new Set([...selectedItems, ...validSelections]),
      ];
      onSelectedItemsChange(newSelections); // Add valid tree selections to existing items
    },
    [onSelectedItemsChange, selectedItems]
  );

  const handleNodeSelectToggle = useCallback(
    (nodeId: string) => {
      const node = findNodeById(nodeId, TreeData);
      if (node) {
        const terminalDescendants = getAllTerminalDescendants(node);
        const anySelected = terminalDescendants.some((id) =>
          selectedItems.includes(id)
        );
        let newSelectedItems: string[];
        if (anySelected) {
          // Deselect all terminal descendants
          newSelectedItems = selectedItems.filter(
            (id) => !terminalDescendants.includes(id)
          );
        } else {
          // Select all terminal descendants
          newSelectedItems = [
            ...new Set([...selectedItems, ...terminalDescendants]),
          ];
        }
        onSelectedItemsChange(newSelectedItems);
      }
    },
    [selectedItems, onSelectedItemsChange]
  );

  const memoizedTreeItems = useMemo(
    () => renderTreeItems(TreeData, selectedItems, handleNodeSelectToggle),
    [selectedItems, handleNodeSelectToggle]
  );

  return (
    <Box>
      <Autocomplete
        multiple
        options={filteredOptions} // Only show options if input length >= 4
        getOptionLabel={(option) => option.name}
        value={terminalNodes.filter((node) => selectedItems.includes(node.id))} // Sync selected items with Autocomplete
        onChange={handleAutocompleteChange}
        inputValue={inputValue}
        onInputChange={handleInputChange} // Properly handle input change
        renderTags={(value, getTagProps) => (
          <Box
            sx={{
              maxHeight: 75, // Set maximum height for the Chips container
              overflowY: "auto", // Enable vertical scrolling
              width: "100%", // Ensure full width
            }}
          >
            {value.map((option, index) => (
              <Chip
                label={option.name}
                {...getTagProps({ index })}
                onDelete={() => handleDelete(option.id)}
                deleteIcon={<CloseIcon />}
              />
            ))}
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Search as individual_dataset"
            helperText={
              inputValue.length < 4
                ? "Type at least 4 characters to search"
                : ""
            }
          />
        )}
      />
      {/* Render tree view */}
      <SimpleTreeView
        aria-label="gmail"
        defaultExpandedItems={[]}
        selectedItems={selectedItems} // Sync selected items with tree
        onSelectedItemsChange={(_, newSelectedItems) =>
          handleTreeSelectionChange(newSelectedItems)
        }
        multiSelect
        slots={{
          expandIcon: ArrowRightIcon,
          collapseIcon: ArrowDropDownIcon,
          endIcon: () => <div style={{ width: 24 }} />,
        }}
        sx={{ flexGrow: 1, maxWidth: 400 }}
      >
        {memoizedTreeItems}
      </SimpleTreeView>
    </Box>
  );
}
