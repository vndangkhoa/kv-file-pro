export type MediaType = 'video' | 'image' | 'audio' | 'pdf' | 'text' | 'code' | 'archive' | 'doc' | 'spreadsheet' | 'presentation' | 'font' | 'other';

export interface FileItem {
  name: string;
  path: string;
  root_name: string;
  is_dir: boolean;
  size: number;
  human_size: string;
  mod_time: string;
  extension: string;
  media_type: MediaType;
  mime_type: string;
  item_count?: number;
  is_system?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface DirectoryListing {
  root_name: string;
  current_path: string;
  breadcrumbs: BreadcrumbItem[];
  items: FileItem[];
  total_items: number;
  total_folders: number;
  total_files: number;
  total_size: number;
  hidden_count?: number;
}

export interface TreeNode {
  name: string;
  path: string;
  root_name: string;
  has_children: boolean;
  children?: TreeNode[];
  is_system?: boolean;
}

export interface StorageRootInfo {
  name: string;
  path: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
}

export interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
  is_totp_enabled?: boolean;
}

export interface Setup2faResponse {
  secret: string;
  qr_code: string;
  otpauth_url: string;
  backup_codes: string[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  requires_2fa?: boolean;
  pre_auth_token?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export type ServerSettings = Record<string, string>;

export interface ShareItem {
  id: string;
  token: string;
  root_name: string;
  path: string;
  is_dir: boolean;
  has_password: boolean;
  expires_at?: string;
  view_count: number;
  allow_download: boolean;
  created_at: string;
  items_json?: string;
}

export interface PublicShareBundleItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  human_size: string;
  mime_type: string;
  media_type: MediaType;
  extension?: string;
}

export interface PublicShareInfo {
  id: string;
  token: string;
  name: string;
  path: string;
  is_dir: boolean;
  is_bundle?: boolean;
  bundle_items?: PublicShareBundleItem[];
  size: number;
  human_size: string;
  mime_type: string;
  media_type: MediaType;
  extension?: string;
  has_password: boolean;
  requires_password?: boolean;
  allow_download: boolean;
  expires_at?: string;
  view_count: number;
  created_at: string;
}

export interface TrashItem {
  id: string;
  root_name: string;
  original_path: string;
  trash_name: string;
  size: number;
  human_size: string;
  is_dir: boolean;
  deleted_at: string;
}

export type ViewMode = 'columns' | 'list' | 'grid';

export interface FsEvent {
  event_type: 'created' | 'modified' | 'deleted' | 'renamed' | 'extension_licensed' | (string & {});
  root_name: string;
  path: string;
  is_dir: boolean;
}

export type ExtensionCategory = 'all' | 'previewer' | 'editor' | 'utility';

export const PRO_BUNDLE_ID = 'kv-files-pro-all';
export const PRO_BUNDLE_PRICE = 199000;

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: 'box' | 'layers' | 'image' | 'code' | 'file-text' | 'palette' | 'cpu' | 'type' | 'workflow';
  category: 'previewer' | 'editor' | 'utility';
  supportedExtensions: string[];
  supportedMimeTypes?: string[];
  size: string;
  badge?: string;
  rating?: number;
  downloads?: string;
  installed?: boolean;
  enabled?: boolean;
  features: string[];
  price?: number;        // Price in VND (e.g. 99000)
  isPaid?: boolean;      // True if commercial/paid extension
  isPurchased?: boolean; // True if valid license exists in SQLite
}

export interface PaymentCreateResponse {
  order_id: string;
  extension_id: string;
  amount: number;
  pay_url: string;
  qr_code_url?: string;
  deeplink?: string;
  status: string;
  is_mock: boolean;
  phone_number?: string;
  receiver_name?: string;
}

export interface ExtensionLicense {
  id: string;
  user_id: string;
  extension_id: string;
  order_id: string;
  license_key: string;
  purchased_at: string;
}

export interface OrderStatusResponse {
  id: string;
  user_id: string;
  extension_id: string;
  amount: number;
  status: 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'CANCELLED' | string;
  momo_trans_id?: string;
  user_note?: string;
  payment_method?: string;
  license_key?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrdersListResponse {
  orders: OrderStatusResponse[];
  total: number;
}

export interface ActivateLicenseRequest {
  code: string;
}

export interface ActivateLicenseResponse {
  success: boolean;
  extension_id: string;
  license_key: string;
  message: string;
}

export interface PreviewExtensionProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  extension: string;
  onDownload?: () => void;
}

export interface SystemEditionInfo {
  edition: 'COMMUNITY' | 'PRO' | string;
  name: string;
  version: string;
  is_licensed: boolean;
  license_tier?: string;
  license_id?: string;
  customer_email?: string;
  is_lifetime: boolean;
  expires_at?: number;
  features: string[];
}


