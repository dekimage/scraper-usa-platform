import React from "react";
import { cn } from "@/lib/utils";
import {
  UserX,
  Phone,
  PhoneOff,
  RefreshCw,
  CheckCircle,
  ThumbsDown,
  Slash,
  Clock,
} from "lucide-react";

/**
 * Status color and icon definitions
 */
const STATUS_CONFIG = {
  "Not Contacted": {
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
    icon: UserX,
  },
  Contacted: {
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
    icon: Phone,
  },
  "Waiting Response": {
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-300",
    icon: Clock,
  },
  "No Answer": {
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
    icon: PhoneOff,
  },
  "Action Required": {
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-300",
    icon: RefreshCw,
  },
  "Closed / Won": {
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-300",
    icon: CheckCircle,
  },
  "Rejected / Not Interested": {
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
    icon: ThumbsDown,
  },
  "Not Qualified": {
    color: "pink",
    bgColor: "bg-pink-100",
    textColor: "text-pink-700",
    borderColor: "border-pink-300",
    icon: Slash,
  },
};

/**
 * Status Badge Component
 *
 * @param {Object} props
 * @param {string} props.status - The pipeline status to display
 * @param {boolean} props.showIcon - Whether to show the status icon
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Size of the badge ('sm', 'md', 'lg')
 */
export function StatusBadge({
  status,
  showIcon = true,
  className,
  size = "md",
}) {
  // Fall back to "Not Contacted" if status is not recognized
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Not Contacted"];
  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs rounded",
    md: "px-2 py-1 text-sm rounded-md",
    lg: "px-3 py-1.5 text-sm rounded-lg",
  };

  const iconSizes = {
    sm: "h-3 w-3 mr-1",
    md: "h-3.5 w-3.5 mr-1.5",
    lg: "h-4 w-4 mr-2",
  };

  return (
    <span
      className={cn(
        config.bgColor,
        config.textColor,
        "font-medium inline-flex items-center",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {status}
    </span>
  );
}

/**
 * Status Badge Component with a border left indicator
 */
export function StatusBadgeWithBorder({
  status,
  showIcon = true,
  className,
  size = "md",
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Not Contacted"];

  return (
    <div
      className={cn(
        "border-l-4",
        `border-l-${config.color}-500`,
        `bg-${config.color}-50`,
        "pl-2 py-1 rounded-r-md",
        className
      )}
    >
      <StatusBadge
        status={status}
        showIcon={showIcon}
        size={size}
        className="bg-transparent"
      />
    </div>
  );
}

export default StatusBadge;
