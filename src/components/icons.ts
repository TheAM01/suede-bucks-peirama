/**
 * Central icon module. The whole app imports icons from here, so the underlying
 * icon set can be swapped in one place (per the design guide). Currently backed
 * by Heroicons v2 (24px outline — stroke-style line icons), aliased to the
 * friendly names used across the codebase.
 */
import type { ComponentPropsWithoutRef, ForwardRefExoticComponent } from "react";

export type IconType = ForwardRefExoticComponent<
  ComponentPropsWithoutRef<"svg"> & { title?: string; titleId?: string }
>;

export {
  // navigation / structure
  Squares2X2Icon as LayoutDashboard,
  ChartBarIcon as BarChart3,
  UsersIcon as Users,
  UserGroupIcon as UsersRound,
  ReceiptPercentIcon as TicketPercent,
  CubeIcon as Package,
  Square3Stack3DIcon as Layers,
  CubeTransparentIcon as Boxes,
  FolderIcon as Folder,
  FolderIcon as FolderTree,
  ShoppingCartIcon as ShoppingCart,
  DocumentTextIcon as FileText,
  CreditCardIcon as CreditCard,
  ShoppingBagIcon as ShoppingBag,
  BuildingStorefrontIcon as Store,
  ComputerDesktopIcon as MonitorSmartphone,
  MapPinIcon as MapPin,
  IdentificationIcon as IdCard,
  Cog6ToothIcon as Settings,
  AdjustmentsHorizontalIcon as Settings2,
  AdjustmentsHorizontalIcon as SlidersHorizontal,
  BookOpenIcon as BookOpen,
  // people / status
  CheckBadgeIcon as BadgeCheck,
  CheckBadgeIcon as UserCheck,
  UserPlusIcon as UserPlus,
  UserIcon as User,
  ShieldCheckIcon as ShieldCheck,
  // money / commerce
  WalletIcon as Wallet,
  CurrencyDollarIcon as DollarSign,
  ReceiptRefundIcon as Receipt,
  TruckIcon as Truck,
  ArrowUturnLeftIcon as RotateCcw,
  ArrowPathRoundedSquareIcon as Repeat,
  PaperAirplaneIcon as Send,
  EnvelopeIcon as MailCheck,
  ChartPieIcon as Percent,
  // catalog / inventory
  CheckCircleIcon as PackageCheck,
  ArchiveBoxXMarkIcon as PackageX,
  CpuChipIcon as Bot,
  BuildingOfficeIcon as Building2,
  BuildingOffice2Icon as Warehouse,
  GlobeAltIcon as Radius,
  CalculatorIcon as Ruler,
  // trend / feedback
  ArrowTrendingUpIcon as TrendingUp,
  ArrowUpRightIcon as ArrowUpRight,
  ArrowDownRightIcon as ArrowDownRight,
  ExclamationTriangleIcon as AlertTriangle,
  ExclamationCircleIcon as AlertCircle,
  InformationCircleIcon as Info,
  CheckCircleIcon as CheckCircle2,
  CheckIcon as Check,
  // arrows / chevrons
  ArrowRightIcon as ArrowRight,
  ArrowLeftIcon as ArrowLeft,
  ArrowUpIcon as ArrowUp,
  ArrowDownIcon as ArrowDown,
  ArrowsUpDownIcon as ArrowUpDown,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  ChevronLeftIcon as ChevronLeft,
  ChevronDoubleLeftIcon as PanelLeftClose,
  ChevronDoubleRightIcon as PanelLeftOpen,
  // actions / controls
  PlusIcon as Plus,
  PencilSquareIcon as Pencil,
  TrashIcon as Trash2,
  EllipsisHorizontalIcon as MoreHorizontal,
  MagnifyingGlassIcon as Search,
  ArrowPathIcon as RefreshCw,
  ArrowPathIcon as Loader2,
  ArrowDownTrayIcon as Download,
  ArrowTopRightOnSquareIcon as ExternalLink,
  Bars3Icon as Menu,
  XMarkIcon as X,
  ArrowRightStartOnRectangleIcon as LogOut,
  HomeIcon as Home,
  LockClosedIcon as Lock,
  QuestionMarkCircleIcon as HelpCircle,
  // system / misc
  SignalIcon as Activity,
  CircleStackIcon as Database,
  ServerIcon as Server,
  LinkIcon as Plug,
  BellIcon as Bell,
  MoonIcon as Moon,
  SunIcon as Sun,
} from "@heroicons/react/24/outline";
