/**
 * Internationalization translations for DispatchBridge.
 * Languages: English (en), Amharic (am), Afan Oromo (om), Tigrigna (ti), Somali (so).
 */

export type SupportedLanguage = 'en' | 'am' | 'om' | 'ti' | 'so';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', shortLabel: 'EN' },
  { code: 'am', label: 'Amharic', nativeName: 'አማርኛ', shortLabel: 'አማ' },
  { code: 'om', label: 'Afan Oromo', nativeName: 'Afaan Oromoo', shortLabel: 'OM' },
  { code: 'ti', label: 'Tigrigna', nativeName: 'ትግርኛ', shortLabel: 'ትግ' },
  { code: 'so', label: 'Somali', nativeName: 'Soomaali', shortLabel: 'SO' },
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Branding & Header
    'app.name': 'DispatchBridge',
    'app.subtitle': 'Delivery & Reconciliation',
    'app.enterprise': 'Enterprise Delivery Engine',

    // Nav Items
    'nav.dashboard': 'Dashboard',
    'nav.dispatches': 'Dispatches',
    'nav.locations': 'Origins & Docks',
    'nav.partners': 'Partners',
    'nav.audit': 'Audit Trail',
    'nav.status': 'System Status',
    'nav.notifications': 'Notifications',
    'nav.simulate_role': 'Simulate Role',
    'nav.signin': 'Sign In / Register',
    'nav.signout': 'Sign Out',
    'nav.theme': 'Theme',
    'nav.language': 'Language',

    // Themes
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    'theme.system': 'System Default',

    // Common Actions
    'action.create_dispatch': 'Create Dispatch',
    'action.inspect': 'Inspect',
    'action.details': 'Details',
    'action.refresh': 'Refresh',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.close': 'Close',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.submit': 'Submit',
    'action.retry': 'Retry',
    'action.copy_link': 'Copy Link',
    'action.reconcile': 'Reconcile Cargo',
    'action.view_all': 'View All',
    'action.manage_partners': 'Manage Partners',

    // Dispatch Statuses
    'status.all': 'All Dispatches',
    'status.draft': 'Draft',
    'status.dispatched': 'Dispatched',
    'status.viewed': 'Viewed by Partner',
    'status.shortfall_damage': 'Shortfall / Damage',
    'status.received_complete': 'Received Complete',
    'status.reconciled': 'Reconciled & Closed',
    'status.in_transit': 'In Transit',

    // Roles
    'role.super_admin': 'Super Administrator',
    'role.business_owner': 'Business Owner',
    'role.sender': 'Sender / Dispatcher',
    'role.receiver': 'Receiver / Partner',

    // Dashboard & Metrics
    'metric.in_transit': 'In Transit / Active',
    'metric.units_dispatched': 'Units Dispatched',
    'metric.recorded_losses': 'Recorded Losses / Shortfalls',
    'metric.reconciliation_rate': 'Reconciliation Rate',
    'metric.total_dispatches': 'Total Dispatches',
    'metric.manifests_active': 'manifests active',
    'metric.loss_categorization': 'Loss Categorization',
    'metric.recent_dispatches': 'Recent Outbound Dispatches',
    'metric.registered_partners': 'Registered Receiving Partners',

    // Table Headers
    'table.dispatch_number': 'Dispatch Number',
    'table.sender_supplier': 'Sender / Supplier',
    'table.destination_partner': 'Destination Partner',
    'table.status': 'Status',
    'table.view_tracking': 'View Tracking',
    'table.quantity_loss': 'Quantity / Loss',
    'table.share_link': 'Share Link',
    'table.action': 'Action',
    'table.items': 'Items',
    'table.reconciliation_outcome': 'Reconciliation Outcome',

    // Banner & Exploration
    'banner.sandbox_mode': 'Sandbox Kernel Mode: Running isolated development provider with mock persistence.',
    'banner.inspect_status': 'Inspect Setup & Status',
    'banner.public_exploration': 'Public Exploration Mode',
    'banner.viewing_sandbox': 'Viewing Sandbox Dispatches',
    'banner.demo_owner': 'Owner Demo',
    'banner.demo_sender': 'Sender Demo',
    'banner.demo_receiver': 'Receiver Demo',

    // System Status
    'system.title': 'System Status & Environment Matrix',
    'system.subtitle': 'Real-time verification of connected adapters, sandbox isolation, platform target, and security policies.',
    'system.rescan': 'Re-scan System',
    'system.target_architecture': 'Target Architecture',
    'system.pwa_badge': 'Progressive Web App (PWA)',
    'system.backend_server': 'Backend Server',
    'system.express_badge': 'Full-Stack Express + Vite Integration',
  },

  am: {
    // Branding & Header
    'app.name': 'ዲስፓችብሪጅ',
    'app.subtitle': 'የእቃ ማድረሻ እና የማስታረቂያ ስርዓት',
    'app.enterprise': 'የንግድ እቃ ማጓጓዣ ሞተር',

    // Nav Items
    'nav.dashboard': 'ዳሽቦርድ',
    'nav.dispatches': 'ጭነቶች',
    'nav.locations': 'መነሻ ጣቢያዎች',
    'nav.partners': 'አጋሮች',
    'nav.audit': 'የኦዲት መዝገብ',
    'nav.status': 'የስርዓት ሁኔታ',
    'nav.notifications': 'ማሳወቂያዎች',
    'nav.simulate_role': 'ሚና ሞክር',
    'nav.signin': 'ግባ / ተመዝገብ',
    'nav.signout': 'ውጣ',
    'nav.theme': 'ገጽታ',
    'nav.language': 'ቋንቋ',

    // Themes
    'theme.dark': 'ጨለማ ገጽታ',
    'theme.light': 'ብርሃን ገጽታ',
    'theme.system': 'የስርዓቱ ምርጫ',

    // Common Actions
    'action.create_dispatch': 'ጭነት ፍጠር',
    'action.inspect': 'መርምር',
    'action.details': 'ዝርዝር',
    'action.refresh': 'አድስ',
    'action.search': 'ፈልግ',
    'action.filter': 'አጣራ',
    'action.close': 'ዝጋ',
    'action.cancel': 'ሰርዝ',
    'action.save': 'አስቀምጥ',
    'action.submit': 'አስገባ',
    'action.retry': 'እንደገና ሞክር',
    'action.copy_link': 'ማስፈንጠሪያ ቅዳ',
    'action.reconcile': 'ጭነት አስታርቅ',
    'action.view_all': 'ሁሉንም እይ',
    'action.manage_partners': 'አጋሮችን አስተዳድር',

    // Dispatch Statuses
    'status.all': 'ሁሉም ጭነቶች',
    'status.draft': 'ረቂቅ',
    'status.dispatched': 'የተላከ',
    'status.viewed': 'በአጋር የታየ',
    'status.shortfall_damage': 'ጉድለት / ጉዳት',
    'status.received_complete': 'ሙሉ በሙሉ ደርሷል',
    'status.reconciled': 'የተረጋገጠ እና የተዘጋ',
    'status.in_transit': 'በመጓጓዝ ላይ',

    // Roles
    'role.super_admin': 'ዋና አስተዳዳሪ',
    'role.business_owner': 'የንግድ ባለቤት',
    'role.sender': 'ላኪ / አሰራጭ',
    'role.receiver': 'ተቀባይ / አጋር',

    // Dashboard & Metrics
    'metric.in_transit': 'በጉዞ ላይ / ንቁ',
    'metric.units_dispatched': 'የተላኩ ክፍሎች',
    'metric.recorded_losses': 'የተመዘገቡ ኪሳራዎች / ጉድለቶች',
    'metric.reconciliation_rate': 'የማስታረቅ ምጣኔ',
    'metric.total_dispatches': 'ጠቅላላ ጭነቶች',
    'metric.manifests_active': 'ንቁ ዝርዝሮች',
    'metric.loss_categorization': 'የኪሳራ ምደባ',
    'metric.recent_dispatches': 'የቅርብ የወጡ ጭነቶች',
    'metric.registered_partners': 'የተመዘገቡ ተቀባይ አጋሮች',

    // Table Headers
    'table.dispatch_number': 'የጭነት ቁጥር',
    'table.sender_supplier': 'ላኪ / አቅራቢ',
    'table.destination_partner': 'መድረሻ አጋር',
    'table.status': 'ሁኔታ',
    'table.view_tracking': 'የእይታ ክትትል',
    'table.quantity_loss': 'ብዛት / ኪሳራ',
    'table.share_link': 'የማጋሪያ ሊንክ',
    'table.action': 'ተግባር',
    'table.items': 'እቃዎች',
    'table.reconciliation_outcome': 'የማስታረቅ ውጤት',

    // Banner & Exploration
    'banner.sandbox_mode': 'የሙከራ ሁነታ፡ የሙከራ ዳታ በመጠቀም ላይ ይገኛል።',
    'banner.inspect_status': 'ሁኔታውን መርምር',
    'banner.public_exploration': 'የህዝብ መመልከቻ ሁነታ',
    'banner.viewing_sandbox': 'የሙከራ ጭነቶችን በመመልከት ላይ',
    'banner.demo_owner': 'የባለቤት ሙከራ',
    'banner.demo_sender': 'የላኪ ሙከራ',
    'banner.demo_receiver': 'የተቀባይ ሙከራ',

    // System Status
    'system.title': 'የስርዓት ሁኔታ እና የመዋቅር ማትሪክስ',
    'system.subtitle': 'የተገናኙ አዳፕተሮች፣ የደህንነት ፖሊሲዎች እና የመድረክ ሁኔታ ቀጥታ ማረጋገጫ።',
    'system.rescan': 'ስርዓቱን በድጋሚ ቃኝ',
    'system.target_architecture': 'የታለመ አርክቴክቸር',
    'system.pwa_badge': 'ተንቀሳቃሽ ድር መተግበሪያ (PWA)',
    'system.backend_server': 'የጀርባ አገልጋይ',
    'system.express_badge': 'ሙሉ ኤክስፕረስ + ቫይት ቅንጅት',
  },

  om: {
    // Branding & Header
    'app.name': 'DhispaachBiriij',
    'app.subtitle': 'Ergisa Miiseensaa fi Araarsa',
    'app.enterprise': 'Mootora Ergaa Daldalaa',

    // Nav Items
    'nav.dashboard': 'Daashboordii',
    'nav.dispatches': 'Ergamoota',
    'nav.locations': 'Buufataalee Dhaqisaa',
    'nav.partners': 'Shaarikoota',
    'nav.audit': 'Galmee Qorannoo',
    'nav.status': 'Haala Sirnaa',
    'nav.notifications': 'Beeksisa',
    'nav.simulate_role': 'Gahee Yaali',
    'nav.signin': 'Seeni / Galmaa\'i',
    'nav.signout': 'Ba\'i',
    'nav.theme': 'Bifaa (Theme)',
    'nav.language': 'Afaan',

    // Themes
    'theme.dark': 'Bifa Dukkanaa',
    'theme.light': 'Bifa Ifaa',
    'theme.system': 'Bifa Sirnaa',

    // Common Actions
    'action.create_dispatch': 'Ergaa Uumi',
    'action.inspect': 'Qoradhu',
    'action.details': 'Bal\'ina',
    'action.refresh': 'Haaromsi',
    'action.search': 'Barbaadi',
    'action.filter': 'Calali',
    'action.close': 'Cufi',
    'action.cancel': 'Dhiisi',
    'action.save': 'Olkaawi',
    'action.submit': 'Ergi',
    'action.retry': 'Irra Deebi\'i',
    'action.copy_link': 'Geessituu Qobi',
    'action.reconcile': 'Ergaa Araarsi',
    'action.view_all': 'Hunda Ilaali',
    'action.manage_partners': 'Shaarikoota Bulchi',

    // Dispatch Statuses
    'status.all': 'Ergamoota Hunda',
    'status.draft': 'Wixinee',
    'status.dispatched': 'Ergameera',
    'status.viewed': 'Shaarikaan Ilaalameera',
    'status.shortfall_damage': 'Hir\'ina / Miidhama',
    'status.received_complete': 'Guutuutti Qaqqabeera',
    'status.reconciled': 'Araaramee Cufameera',
    'status.in_transit': 'Imala Irra Jira',

    // Roles
    'role.super_admin': 'Bulchaa Ol\'aanaa',
    'role.business_owner': 'Abbaa Daldalaa',
    'role.sender': 'Ergaa / Raabsaa',
    'role.receiver': 'Fudhataa / Shaarika',

    // Dashboard & Metrics
    'metric.in_transit': 'Imala Irra / Hojii Irra',
    'metric.units_dispatched': 'Qooda Ergaman',
    'metric.recorded_losses': 'Kasaaraa Galmaa\'e',
    'metric.reconciliation_rate': 'Reetii Araarsaa',
    'metric.total_dispatches': 'Dimshaasha Ergamootaa',
    'metric.manifests_active': 'maniifeestota hojii irra jiran',
    'metric.loss_categorization': 'Qoodiinsa Kasaaraa',
    'metric.recent_dispatches': 'Ergamoota Dhihoo',
    'metric.registered_partners': 'Shaarikoota Galmaa\'an',

    // Table Headers
    'table.dispatch_number': 'Lakkoofsa Ergaa',
    'table.sender_supplier': 'Ergaa / Dhiyeessaa',
    'table.destination_partner': 'Shaarika Qaqqabiinsaa',
    'table.status': 'Haala',
    'table.view_tracking': 'Hordoffii Ilaalchaa',
    'table.quantity_loss': 'Baay\'ina / Kasaaraa',
    'table.share_link': 'Geessituu Hiruu',
    'table.action': 'Tarkaanfii',
    'table.items': 'Meeshaalee',
    'table.reconciliation_outcome': 'Bu\'aa Araarsaa',

    // Banner & Exploration
    'banner.sandbox_mode': 'Haala Saandibooksii: Qophii yaalii hojii irra jira.',
    'banner.inspect_status': 'Haala Qoradhu',
    'banner.public_exploration': 'Haala Qorannoo Sabaa',
    'banner.viewing_sandbox': 'Ergamoota Yaalii Ilaaluu',
    'banner.demo_owner': 'Yaalii Abbaa',
    'banner.demo_sender': 'Yaalii Ergaa',
    'banner.demo_receiver': 'Yaalii Fudhataa',

    // System Status
    'system.title': 'Haala Sirnaa fi Maatriiksii Naannoo',
    'system.subtitle': 'Mirkaneessa sirna adda addaa fi imaammata nageenyaa yeroo qabatamaa.',
    'system.rescan': 'Irra Deebi\'ii Sakatta\'i',
    'system.target_architecture': 'Arkiiteektarii Kaayyoeffatame',
    'system.pwa_badge': 'PWA Mobayilaa',
    'system.backend_server': 'Serverii Duubaa',
    'system.express_badge': 'Walitti Hidhaminsa Express + Vite',
  },

  ti: {
    // Branding & Header
    'app.name': 'ዲስፓችብሪጅ',
    'app.subtitle': 'ምልኣኽን መዐረቒን ስርዓት',
    'app.enterprise': 'ሞተር ምልኣኽ ንግዲ',

    // Nav Items
    'nav.dashboard': 'ዳሽቦርድ',
    'nav.dispatches': 'ምልኣኻት',
    'nav.locations': 'መበገሲ መዕረፊታት',
    'nav.partners': 'መሻርኽቲ',
    'nav.audit': 'መዝገብ ኦዲት',
    'nav.status': 'ኩነታት ስርዓት',
    'nav.notifications': 'መፍለጥታታት',
    'nav.simulate_role': 'ተራ ፈትን',
    'nav.signin': 'እተው / ተመዝገብ',
    'nav.signout': 'ውጻእ',
    'nav.theme': 'ገጽታ',
    'nav.language': 'ቋንቋ',

    // Themes
    'theme.dark': 'ጸሊም ገጽታ',
    'theme.light': 'ብሩህ ገጽታ',
    'theme.system': 'ናይ ስርዓት ምርጫ',

    // Common Actions
    'action.create_dispatch': 'ምልኣኽ ፍጠር',
    'action.inspect': 'መርምር',
    'action.details': 'ዝርዝር',
    'action.refresh': 'ሓድስ',
    'action.search': 'ድለ',
    'action.filter': 'ኣጻሪ',
    'action.close': 'ዕጸው',
    'action.cancel': 'ሰርዝ',
    'action.save': 'ኣቐምጥ',
    'action.submit': 'ኣረክብ',
    'action.retry': 'ደጊምካ ፈትን',
    'action.copy_link': 'መላገቢ ቅዳሕ',
    'action.reconcile': 'ምልኣኽ ኣዐሪቕ',
    'action.view_all': 'ኩሉ ርአ',
    'action.manage_partners': 'መሻርኽቲ ኣመሓድር',

    // Dispatch Statuses
    'status.all': 'ኩሎም ምልኣኻት',
    'status.draft': 'ንድፊ',
    'status.dispatched': 'ዝተላእከ',
    'status.viewed': 'ብመሻርኽቲ ዝተራእየ',
    'status.shortfall_damage': 'ጉድለት / ዝተበላሸወ',
    'status.received_complete': 'ምሉእ ብምሉእ ዝበጽሐ',
    'status.reconciled': 'ዝተረጋገጸን ዝተዓጸወን',
    'status.in_transit': 'ኣብ ጉዕዞ ዘሎ',

    // Roles
    'role.super_admin': 'ላዕለዋይ ኣመሓዳሪ',
    'role.business_owner': 'ዋና ንግዲ',
    'role.sender': 'ላኣኺ / መከፋፈሊ',
    'role.receiver': 'ተቐባሊ / መሻርኽቲ',

    // Dashboard & Metrics
    'metric.in_transit': 'ኣብ ጉዕዞ / ንጡፍ',
    'metric.units_dispatched': 'ዝተላእኩ ኣቑሑት',
    'metric.recorded_losses': 'ዝተመዝገቡ ኪሳራታት',
    'metric.reconciliation_rate': 'ምጣኔ መዐረቒ',
    'metric.total_dispatches': 'ጠቕላላ ምልኣኻት',
    'metric.manifests_active': 'ንጡፋት ዝርዝራት',
    'metric.loss_categorization': 'ምድብ ኪሳራ',
    'metric.recent_dispatches': 'ናይ ቀረባ ምልኣኻት',
    'metric.registered_partners': 'ዝተመዝገቡ መሻርኽቲ',

    // Table Headers
    'table.dispatch_number': 'ቁጽሪ ምልኣኽ',
    'table.sender_supplier': 'ላኣኺ / ኣቕራቢ',
    'table.destination_partner': 'መዕረፊ መሻርኽቲ',
    'table.status': 'ኩነታት',
    'table.view_tracking': 'ክትትል ምርኣይ',
    'table.quantity_loss': 'ብዝሒ / ኪሳራ',
    'table.share_link': 'መላገቢ ምልኣኽ',
    'table.action': 'ተግባር',
    'table.items': 'ኣቑሑት',
    'table.reconciliation_outcome': 'ውጽኢት መዐረቒ',

    // Banner & Exploration
    'banner.sandbox_mode': 'ናይ ፈተነ ሁነታ፡ ንመሞከሪ ዝተዳለወ ሓበሬታ ኣብ ጥቕሚ ይውዕል ኣሎ።',
    'banner.inspect_status': 'ኩነታት መርምር',
    'banner.public_exploration': 'ናይ ህዝቢ መርመራ ሁነታ',
    'banner.viewing_sandbox': 'ናይ ፈተነ ምልኣኻት ምርኣይ',
    'banner.demo_owner': 'ናይ ዋና ፈተነ',
    'banner.demo_sender': 'ናይ ላኣኺ ፈተነ',
    'banner.demo_receiver': 'ናይ ተቐባሊ ፈተነ',

    // System Status
    'system.title': 'ኩነታት ስርዓትን ማትሪክስ ከባቢን',
    'system.subtitle': 'ምርግጋጽ ዝተተሓሓዙ ኣዳፕተራትን ፖሊሲታት ድሕንነትን።',
    'system.rescan': 'ስርዓት ደጊምካ መርምር',
    'system.target_architecture': 'ዝተሓሰበ ቅርጺ',
    'system.pwa_badge': 'ሞባይል PWA',
    'system.backend_server': 'ናይ ድሕሪት ሰርቨር',
    'system.express_badge': 'ምውህሃድ Express + Vite',
  },

  so: {
    // Branding & Header
    'app.name': 'DispatchBridge',
    'app.subtitle': 'Dhoofinta & Dib-u-heshiisiinta Xamuulka',
    'app.enterprise': 'Mashiinka Xamuulka Ganacsiga',

    // Nav Items
    'nav.dashboard': 'Boorashka',
    'nav.dispatches': 'Xamuullada',
    'nav.locations': 'Xarumaha & Dekadaha',
    'nav.partners': 'Wada-hawlgalayaasha',
    'nav.audit': 'Raadraaca Hanti-dhowrka',
    'nav.status': 'Xaaladda Nidaamka',
    'nav.notifications': 'Ogeysiisyada',
    'nav.simulate_role': 'Tijaabi Doorka',
    'nav.signin': 'Gal / Isdiiwaangeli',
    'nav.signout': 'Ka Bax',
    'nav.theme': 'Muuqaalka',
    'nav.language': 'Luqadda',

    // Themes
    'theme.dark': 'Muuqaal Mugdi ah',
    'theme.light': 'Muuqaal Iftiin ah',
    'theme.system': 'Nidaamka Caadiga ah',

    // Common Actions
    'action.create_dispatch': 'Abuur Xamuul',
    'action.inspect': 'Baar',
    'action.details': 'Faahfaahin',
    'action.refresh': 'Cusbooneysii',
    'action.search': 'Raadi',
    'action.filter': 'Kala Shaandhee',
    'action.close': 'Xir',
    'action.cancel': 'Jooji',
    'action.save': 'Keydi',
    'action.submit': 'Gudbi',
    'action.retry': 'Isku day mar kale',
    'action.copy_link': 'Koobi Xiriirinta',
    'action.reconcile': 'Heshiisii Xamuulka',
    'action.view_all': 'Eeg Dhammaan',
    'action.manage_partners': 'Maamul Wada-hawlgalayaasha',

    // Dispatch Statuses
    'status.all': 'Dhammaan Xamuullada',
    'status.draft': 'Qabyo',
    'status.dispatched': 'La Dhoofiyay',
    'status.viewed': 'Wada-hawlgalaha ayaa Aragay',
    'status.shortfall_damage': 'Yaraan / Burbur',
    'status.received_complete': 'Si Buuxda Loo Helay',
    'status.reconciled': 'La Heshiisiiyay & La Xiray',
    'status.in_transit': 'Safarka ku Jira',

    // Roles
    'role.super_admin': 'Maamulaha Sare',
    'role.business_owner': 'Mulkiilaha Ganacsiga',
    'role.sender': 'Dhoofiyaha / Qaybiyaha',
    'role.receiver': 'Qaatada / Wada-hawlgalaha',

    // Dashboard & Metrics
    'metric.in_transit': 'Socdaalka / Firfircoon',
    'metric.units_dispatched': 'Qeybaha La Dhoofiyay',
    'metric.recorded_losses': 'Khasaaraha La Diiwaangeliyay',
    'metric.reconciliation_rate': 'Heerka Dib-u-heshiisiinta',
    'metric.total_dispatches': 'Wadarta Xamuullada',
    'metric.manifests_active': 'shixnadaha firfircoon',
    'metric.loss_categorization': 'Kala Qeybinta Khasaaraha',
    'metric.recent_dispatches': 'Xamuullada Dhowaan Baxay',
    'metric.registered_partners': 'Wada-hawlgalayaasha Diiwaangashan',

    // Table Headers
    'table.dispatch_number': 'Lambarka Xamuulka',
    'table.sender_supplier': 'Dhoofiyaha / Bixiyaha',
    'table.destination_partner': 'Wada-hawlgalaha U Socdo',
    'table.status': 'Xaaladda',
    'table.view_tracking': 'Raadraaca Muuqaalka',
    'table.quantity_loss': 'Tirada / Khasaaraha',
    'table.share_link': 'Xiriirinta Wadaagga',
    'table.action': 'Ficilka',
    'table.items': 'Alaabaha',
    'table.reconciliation_outcome': 'Natiijada Dib-u-heshiisiinta',

    // Banner & Exploration
    'banner.sandbox_mode': 'Habka Tijaabada: Xogta tijaabada ayaa la isticmaalayaa.',
    'banner.inspect_status': 'Baar Xaaladda',
    'banner.public_exploration': 'Habka Baarista Dadweynaha',
    'banner.viewing_sandbox': 'Eegista Xamuullada Tijaabada',
    'banner.demo_owner': 'Tijaabada Mulkiilaha',
    'banner.demo_sender': 'Tijaabada Dhoofiyaha',
    'banner.demo_receiver': 'Tijaabada Qaatada',

    // System Status
    'system.title': 'Xaaladda Nidaamka & Matrikiska Deegaanka',
    'system.subtitle': 'Hubinta tooska ah ee adabtarada ku xiran iyo xeerarka amniga.',
    'system.rescan': 'Dib u Baar Nidaamka',
    'system.target_architecture': 'Qaab-dhismeedka Bartilmaameedka',
    'system.pwa_badge': 'Barnaamijka Shabakadda PWA',
    'system.backend_server': 'Server-ka Dambe',
    'system.express_badge': 'Isku-darka Express + Vite',
  },
};
