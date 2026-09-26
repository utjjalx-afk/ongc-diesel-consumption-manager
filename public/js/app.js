if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
/**
 * ONGC Diesel Consumption Web Application - Frontend Controller
 */

// Application State
let appState = {
  vehicles: [],
  fleetSummary: {},
  dieselIssuedRecords: [],
  loadedFile: null,
  activeVehicleId: null,
  activeBatchId: null,
  searchQuery: '',
  wellSiteData: { fields: [], clusters: [], wells: [], totalWells: 0, totalClusters: 0 },
  selectedWellField: 'ALL',
  wellSearchQuery: '',
  activeMainTab: null,
  mainSelectedWellField: 'ALL',
  mainWellSearchQuery: '',
  settingsClusterSearchQuery: '',
  maintenanceData: { vehicles: [], maintenanceRecords: [], totalVehicles: 0, totalRecords: 0, validDocsCount: 0, expiringDocsCount: 0 },
  selectedMaintenanceVehicle: 'ALL',
  maintenanceSearchQuery: '',
  isAuthenticated: false,
  currentUser: null,
  otFdeData: { roster: {}, jobs: [] },
  activeOtSubTab: null,
  selectedCrewCodes: new Set(['UC', 'RD', 'YA', 'AB']),
  activeOtStatementEmployee: 'UC',
  activeOtStatementMonth: '2025-01',
  activeFdeStatementEmployee: 'UC',
  activeFdeStatementMonth: '2025-01',
  otAllJobsSearchQuery: '',
  activeOtPeriodMode: 'month',
  activeOtYear: '2025',
  activeOtYearCrew: 'ALL',
  rosterFilter: 'active'
};

// DOM Elements
const elements = {
  // Enterprise Login & Authentication
  loginScreen: document.getElementById('loginScreen'),
  loginForm: document.getElementById('loginForm'),
  loginUserId: document.getElementById('loginUserId'),
  loginPassword: document.getElementById('loginPassword'),
  btnTogglePassword: document.getElementById('btnTogglePassword'),
  eyeIcon: document.getElementById('eyeIcon'),
  rememberMe: document.getElementById('rememberMe'),
  btnSubmitLogin: document.getElementById('btnSubmitLogin'),
  loginAlertBox: document.getElementById('loginAlertBox'),
  hintUserId: document.getElementById('hintUserId'),
  hintPassword: document.getElementById('hintPassword'),
  btnSignOut: document.getElementById('btnSignOut'),

  // Brand & Actions
  btnLoadDefault: document.getElementById('btnLoadDefault'),
  fileInput: document.getElementById('fileInput'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  btnOpenPdfModal: document.getElementById('btnOpenPdfModal'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIcon: document.getElementById('themeIcon'),

  // Status Banner
  loadedFileName: document.getElementById('loadedFileName'),
  loadedFileBadge: document.getElementById('loadedFileBadge'),
  lastUpdatedMeta: document.getElementById('lastUpdatedMeta'),

  // Fleet KPIs
  kpiFleetVehicles: document.getElementById('kpiFleetVehicles'),
  kpiFleetIssued: document.getElementById('kpiFleetIssued'),
  kpiFleetDistance: document.getElementById('kpiFleetDistance'),
  kpiFleetEngine: document.getElementById('kpiFleetEngine'),
  kpiFleetConsumed: document.getElementById('kpiFleetConsumed'),
  kpiFleetBalance: document.getElementById('kpiFleetBalance'),
  kpiFleetBalanceWrap: document.getElementById('kpiFleetBalanceWrap'),

  // Vehicle Workspace
  vehicleTabsContainer: document.getElementById('vehicleTabsContainer'),
  btnOpenAddVehicleModal: document.getElementById('btnOpenAddVehicleModal'),
  activeVehicleTitle: document.getElementById('activeVehicleTitle'),
  activeVehicleType: document.getElementById('activeVehicleType'),
  activeVehicleTripsCount: document.getElementById('activeVehicleTripsCount'),
  batchSelect: document.getElementById('batchSelect'),
  btnOpenAddBatchModal: document.getElementById('btnOpenAddBatchModal'),
  btnEditBatchSettings: document.getElementById('btnEditBatchSettings'),

  // Batch Summary Panel
  cardIssueQty: document.getElementById('cardIssueQty'),
  cardIssueDate: document.getElementById('cardIssueDate'),
  cardRoadDist: document.getElementById('cardRoadDist'),
  cardTruckAvg: document.getElementById('cardTruckAvg'),
  cardRoadLiters: document.getElementById('cardRoadLiters'),
  cardEngineHours: document.getElementById('cardEngineHours'),
  cardEngineAvg: document.getElementById('cardEngineAvg'),
  cardEngineLiters: document.getElementById('cardEngineLiters'),
  cardTotalConsumed: document.getElementById('cardTotalConsumed'),
  cardSurplusStock: document.getElementById('cardSurplusStock'),
  cardBalanceStatus: document.getElementById('cardBalanceStatus'),
  reserveAlertBar: document.getElementById('reserveAlertBar'),
  reserveAlertText: document.getElementById('reserveAlertText'),

  // Direct Entry Panel on Dashboard
  directEntrySection: document.getElementById('directEntrySection'),
  directEntryForm: document.getElementById('directEntryForm'),
  directVehicleSelect: document.getElementById('directVehicleSelect'),
  directBatchSelect: document.getElementById('directBatchSelect'),
  directDate: document.getElementById('directDate'),
  directDistance: document.getElementById('directDistance'),
  directEngineHours: document.getElementById('directEngineHours'),
  directDetails: document.getElementById('directDetails'),
  directJob: document.getElementById('directJob'),
  directRemarks: document.getElementById('directRemarks'),
  btnDirectSubmit: document.getElementById('btnDirectSubmit'),
  btnDirectClear: document.getElementById('btnDirectClear'),
  previewTotalHSD: document.getElementById('previewTotalHSD'),
  previewRoadL: document.getElementById('previewRoadL'),
  previewEngineL: document.getElementById('previewEngineL'),

  // Trip Log
  btnOpenAddEntryModal: document.getElementById('btnOpenAddEntryModal'),
  entriesCountText: document.getElementById('entriesCountText'),
  searchInput: document.getElementById('searchInput'),
  tripEntriesTableBody: document.getElementById('tripEntriesTableBody'),

  // Modals
  entryModal: document.getElementById('entryModal'),
  entryForm: document.getElementById('entryForm'),
  entryModalTitle: document.getElementById('entryModalTitle'),
  entryModalId: document.getElementById('entryModalId'),
  entryDate: document.getElementById('entryDate'),
  entryDistance: document.getElementById('entryDistance'),
  entryDetails: document.getElementById('entryDetails'),
  entryJob: document.getElementById('entryJob'),
  entryEngineHours: document.getElementById('entryEngineHours'),
  entryRemarks: document.getElementById('entryRemarks'),
  btnCloseEntryModal: document.getElementById('btnCloseEntryModal'),
  btnCancelEntryModal: document.getElementById('btnCancelEntryModal'),

  batchModal: document.getElementById('batchModal'),
  batchForm: document.getElementById('batchForm'),
  batchYear: document.getElementById('batchYear'),
  batchIssueDate: document.getElementById('batchIssueDate'),
  batchIssuedQty: document.getElementById('batchIssuedQty'),
  batchTruckAvg: document.getElementById('batchTruckAvg'),
  batchEngineAvg: document.getElementById('batchEngineAvg'),
  batchRemarks: document.getElementById('batchRemarks'),
  btnCloseBatchModal: document.getElementById('btnCloseBatchModal'),
  btnCancelBatchModal: document.getElementById('btnCancelBatchModal'),

  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsYear: document.getElementById('settingsYear'),
  settingsIssueDate: document.getElementById('settingsIssueDate'),
  settingsIssuedQty: document.getElementById('settingsIssuedQty'),
  settingsTruckAvg: document.getElementById('settingsTruckAvg'),
  settingsEngineAvg: document.getElementById('settingsEngineAvg'),
  btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
  btnCancelSettingsModal: document.getElementById('btnCancelSettingsModal'),

  vehicleModal: document.getElementById('vehicleModal'),
  vehicleForm: document.getElementById('vehicleForm'),
  vehicleRegName: document.getElementById('vehicleRegName'),
  vehicleType: document.getElementById('vehicleType'),
  btnCloseVehicleModal: document.getElementById('btnCloseVehicleModal'),
  btnCancelVehicleModal: document.getElementById('btnCancelVehicleModal'),

  pdfModal: document.getElementById('pdfModal'),
  btnClosePdfModal: document.getElementById('btnClosePdfModal'),
  btnCancelPdfModal: document.getElementById('btnCancelPdfModal'),
  btnDownloadPdfConfirm: document.getElementById('btnDownloadPdfConfirm'),
  pdfVehicleOptionLabel: document.getElementById('pdfVehicleOptionLabel'),
  pdfBatchOptionLabel: document.getElementById('pdfBatchOptionLabel'),

  // Well Sites & Route Assistant
  btnOpenWellSitesModal: document.getElementById('btnOpenWellSitesModal'),
  headerWellCountBadge: document.getElementById('headerWellCountBadge'),
  allWellSuggestions: document.getElementById('allWellSuggestions'),
  btnToggleRouteHelper: document.getElementById('btnToggleRouteHelper'),
  routeHelperBox: document.getElementById('routeHelperBox'),
  routeFromSelect: document.getElementById('routeFromSelect'),
  routeToSelect: document.getElementById('routeToSelect'),
  routeParkedSelect: document.getElementById('routeParkedSelect'),
  btnApplyRoute: document.getElementById('btnApplyRoute'),
  btnBrowseAllWells: document.getElementById('btnBrowseAllWells'),

  // Well Sites Modal
  wellSitesModal: document.getElementById('wellSitesModal'),
  btnCloseWellSitesModal: document.getElementById('btnCloseWellSitesModal'),
  btnCloseWellSitesBottom: document.getElementById('btnCloseWellSitesBottom'),
  wellSitesSubheader: document.getElementById('wellSitesSubheader'),
  wellSearchInput: document.getElementById('wellSearchInput'),
  btnReloadWellSites: document.getElementById('btnReloadWellSites'),
  wellFileInput: document.getElementById('wellFileInput'),
  fieldFilterBar: document.getElementById('fieldFilterBar'),
  wellClusterGrid: document.getElementById('wellClusterGrid'),
  wellDirectoryCountText: document.getElementById('wellDirectoryCountText'),

  // App Main Navigation & Sidebar
  appSidebar: document.getElementById('appSidebar'),
  btnSidebarMinimize: document.getElementById('btnSidebarMinimize'),
  btnHeaderSidebarToggle: document.getElementById('btnHeaderSidebarToggle'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  tabBtnWellSites: document.getElementById('tabBtnWellSites'),
  tabBtnVehicleLog: document.getElementById('tabBtnVehicleLog'),
  tabBtnSettings: document.getElementById('tabBtnSettings'),
  navWellCount: document.getElementById('navWellCount'),
  navFleetCount: document.getElementById('navFleetCount'),
  navSettingsBadge: document.getElementById('navSettingsBadge'),

  // Tab Views (Closed System)
  viewHomeHub: document.getElementById('viewHomeHub'),
  viewWellSites: document.getElementById('viewWellSites'),
  viewVehicleLog: document.getElementById('viewVehicleLog'),
  viewMaintenance: document.getElementById('viewMaintenance'),
  viewOtFde: document.getElementById('viewOtFde'),
  viewSettings: document.getElementById('viewSettings'),
  hubBadgeWells: document.getElementById('hubBadgeWells'),
  hubBadgeVehicles: document.getElementById('hubBadgeVehicles'),
  hubBadgeDocs: document.getElementById('hubBadgeDocs'),
  hubBadgeCrew: document.getElementById('hubBadgeCrew'),
  hubBadgeClusters: document.getElementById('hubBadgeClusters'),

  // Tab 1: Well Sites View
  btnGoToSettingsWell: document.getElementById('btnGoToSettingsWell'),
  btnSwitchToVehicleLog: document.getElementById('btnSwitchToVehicleLog'),
  kpiWellSitesCount: document.getElementById('kpiWellSitesCount'),
  kpiWellClustersCount: document.getElementById('kpiWellClustersCount'),
  kpiWellFieldsCount: document.getElementById('kpiWellFieldsCount'),
  mainWellSearchInput: document.getElementById('mainWellSearchInput'),
  mainWellCountText: document.getElementById('mainWellCountText'),
  mainFieldFilterBar: document.getElementById('mainFieldFilterBar'),
  mainWellClusterGrid: document.getElementById('mainWellClusterGrid'),

  // Tab 3: Settings View
  btnSettingsReloadWellFile: document.getElementById('btnSettingsReloadWellFile'),
  btnReturnToWellSites: document.getElementById('btnReturnToWellSites'),
  addClusterForm: document.getElementById('addClusterForm'),
  newClusterField: document.getElementById('newClusterField'),
  newClusterName: document.getElementById('newClusterName'),
  newClusterWells: document.getElementById('newClusterWells'),
  btnSettingsReloadWell: document.getElementById('btnSettingsReloadWell'),
  settingsWellFileInput: document.getElementById('settingsWellFileInput'),
  btnSettingsReloadVehicle: document.getElementById('btnSettingsReloadVehicle'),
  settingsVehicleFileInput: document.getElementById('settingsVehicleFileInput'),
  settingsClusterSearch: document.getElementById('settingsClusterSearch'),
  settingsClusterTableBody: document.getElementById('settingsClusterTableBody'),

  // Edit Cluster Modal
  editClusterModal: document.getElementById('editClusterModal'),
  editClusterForm: document.getElementById('editClusterForm'),
  editClusterId: document.getElementById('editClusterId'),
  editClusterField: document.getElementById('editClusterField'),
  editClusterName: document.getElementById('editClusterName'),
  editClusterWells: document.getElementById('editClusterWells'),
  btnCloseEditClusterModal: document.getElementById('btnCloseEditClusterModal'),
  btnCancelEditClusterModal: document.getElementById('btnCancelEditClusterModal'),

  // SAP Fiori ShellBar & Navigation
  shellSapLogo: document.getElementById('shellSapLogo'),
  shellNavHome: document.getElementById('shellNavHome'),
  shellUserAvatar: document.getElementById('shellUserAvatar'),
  btnShellSearch: document.getElementById('btnShellSearch'),
  subnavMyHome: document.getElementById('subnavMyHome'),
  btnEssDropdown: document.getElementById('btnEssDropdown'),
  essPopoverMenu: document.getElementById('essPopoverMenu'),
  btnQuickWellSites: document.getElementById('btnQuickWellSites'),
  btnQuickVehicleLog: document.getElementById('btnQuickVehicleLog'),
  btnQuickSettings: document.getElementById('btnQuickSettings'),

  // SAP Launchpad View
  viewSapLaunchpad: document.getElementById('viewSapLaunchpad'),

  // Tab 3: Maintenance Elements
  tabBtnMaintenance: document.getElementById('tabBtnMaintenance'),
  navMaintenanceCount: document.getElementById('navMaintenanceCount'),
  viewMaintenance: document.getElementById('viewMaintenance'),
  btnReloadMaintenance: document.getElementById('btnReloadMaintenance'),
  maintenanceFileInput: document.getElementById('maintenanceFileInput'),
  btnOpenLogMaintenanceModal: document.getElementById('btnOpenLogMaintenanceModal'),

  // Maintenance KPIs
  kpiMaintFleetCount: document.getElementById('kpiMaintFleetCount'),
  kpiMaintValidDocs: document.getElementById('kpiMaintValidDocs'),
  kpiMaintExpiringDocs: document.getElementById('kpiMaintExpiringDocs'),
  kpiMaintTotalRecords: document.getElementById('kpiMaintTotalRecords'),

  // Maintenance Tables & Filters
  maintenanceDocMatrixBody: document.getElementById('maintenanceDocMatrixBody'),
  maintRecordsCountText: document.getElementById('maintRecordsCountText'),
  maintenanceSearchInput: document.getElementById('maintenanceSearchInput'),
  maintenanceVehicleFilterBar: document.getElementById('maintenanceVehicleFilterBar'),
  maintenanceTableBody: document.getElementById('maintenanceTableBody'),

  // Modals for Maintenance
  logMaintenanceModal: document.getElementById('logMaintenanceModal'),
  btnCloseLogMaintenanceModal: document.getElementById('btnCloseLogMaintenanceModal'),
  btnCancelLogMaintenanceModal: document.getElementById('btnCancelLogMaintenanceModal'),
  logMaintenanceForm: document.getElementById('logMaintenanceForm'),
  maintVehicleSelect: document.getElementById('maintVehicleSelect'),
  maintDate: document.getElementById('maintDate'),
  maintCategory: document.getElementById('maintCategory'),
  maintCost: document.getElementById('maintCost'),
  maintDetails: document.getElementById('maintDetails'),
  maintParts: document.getElementById('maintParts'),
  maintWorkshop: document.getElementById('maintWorkshop'),

  editMaintenanceModal: document.getElementById('editMaintenanceModal'),
  btnCloseEditMaintenanceModal: document.getElementById('btnCloseEditMaintenanceModal'),
  btnCancelEditMaintenanceModal: document.getElementById('btnCancelEditMaintenanceModal'),
  editMaintenanceForm: document.getElementById('editMaintenanceForm'),
  editMaintId: document.getElementById('editMaintId'),
  editMaintVehicleSelect: document.getElementById('editMaintVehicleSelect'),
  editMaintDate: document.getElementById('editMaintDate'),
  editMaintCategory: document.getElementById('editMaintCategory'),
  editMaintCost: document.getElementById('editMaintCost'),
  editMaintDetails: document.getElementById('editMaintDetails'),
  editMaintParts: document.getElementById('editMaintParts'),
  editMaintWorkshop: document.getElementById('editMaintWorkshop'),

  editDocumentsModal: document.getElementById('editDocumentsModal'),
  btnCloseEditDocumentsModal: document.getElementById('btnCloseEditDocumentsModal'),
  btnCancelEditDocumentsModal: document.getElementById('btnCancelEditDocumentsModal'),
  editDocumentsForm: document.getElementById('editDocumentsForm'),
  editDocVehicleId: document.getElementById('editDocVehicleId'),
  editDocVehicleBadge: document.getElementById('editDocVehicleBadge'),
  editDocTax: document.getElementById('editDocTax'),
  editDocPollution: document.getElementById('editDocPollution'),
  editDocInsurance: document.getElementById('editDocInsurance'),
  editDocPermit: document.getElementById('editDocPermit'),

  // Tab 4: OT & FDE Elements
  tabBtnOtFde: document.getElementById('tabBtnOtFde'),
  viewOtFde: document.getElementById('viewOtFde'),
  navOtFdeBadge: document.getElementById('navOtFdeBadge'),
  btnQuickLogJob: document.getElementById('btnQuickLogJob'),
  btnHeaderExportOtPdf: document.getElementById('btnHeaderExportOtPdf'),
  btnHeaderExportFdePdf: document.getElementById('btnHeaderExportFdePdf'),
  btnSubOtLogJob: document.getElementById('btnSubOtLogJob'),
  btnSubOtStatement: document.getElementById('btnSubOtStatement'),
  btnSubFdeStatement: document.getElementById('btnSubFdeStatement'),
  btnSubOtAllJobs: document.getElementById('btnSubOtAllJobs'),
  btnSubOtRoster: document.getElementById('btnSubOtRoster'),
  badgeAllJobsCount: document.getElementById('badgeAllJobsCount'),

  // Sub-views
  otSubViewLogJob: document.getElementById('otSubViewLogJob'),
  otSubViewOtStatement: document.getElementById('otSubViewOtStatement'),
  otSubViewFdeStatement: document.getElementById('otSubViewFdeStatement'),
  otSubViewAllJobs: document.getElementById('otSubViewAllJobs'),
  otSubViewRoster: document.getElementById('otSubViewRoster'),

  // Single Entry Form
  formOtFieldJob: document.getElementById('formOtFieldJob'),
  otJobDate: document.getElementById('otJobDate'),
  otJobVehicle: document.getElementById('otJobVehicle'),
  otJobFieldLocation: document.getElementById('otJobFieldLocation'),
  otJobWellSite: document.getElementById('otJobWellSite'),
  otWellList: document.getElementById('otWellList'),
  otJobDepTime: document.getElementById('otJobDepTime'),
  otJobArrTime: document.getElementById('otJobArrTime'),
  otJobIsHoliday: document.getElementById('otJobIsHoliday'),
  otJobDescription: document.getElementById('otJobDescription'),
  otJobWellRemarks: document.getElementById('otJobWellRemarks'),
  otWinchIsStandby: document.getElementById('otWinchIsStandby'),
  otWinchStartKm: document.getElementById('otWinchStartKm'),
  otWinchStopKm: document.getElementById('otWinchStopKm'),
  otWinchDistanceBadge: document.getElementById('otWinchDistanceBadge'),
  otWinchDistance: document.getElementById('otWinchDistance'),
  otWinchEngineHours: document.getElementById('otWinchEngineHours'),
  otWinchRemarks: document.getElementById('otWinchRemarks'),
  crewSelectCountBadge: document.getElementById('crewSelectCountBadge'),
  otCrewChipsContainer: document.getElementById('otCrewChipsContainer'),
  btnPresetCrewA: document.getElementById('btnPresetCrewA'),
  btnPresetCrewB: document.getElementById('btnPresetCrewB'),
  btnPresetCrewC: document.getElementById('btnPresetCrewC'),
  btnSelectAllCrew: document.getElementById('btnSelectAllCrew'),
  btnClearCrewSelection: document.getElementById('btnClearCrewSelection'),
  btnSaveFieldJob: document.getElementById('btnSaveFieldJob'),

  // Batch Employee Tools
  inpBatchIncrementPct: document.getElementById('inpBatchIncrementPct'),
  btnApplyBatchIncrement: document.getElementById('btnApplyBatchIncrement'),
  selBatchDaType: document.getElementById('selBatchDaType'),
  inpBatchDaValue: document.getElementById('inpBatchDaValue'),
  btnApplyBatchDa: document.getElementById('btnApplyBatchDa'),

  // Live Preview
  prevDutyHours: document.getElementById('prevDutyHours'),
  prevFdShifts: document.getElementById('prevFdShifts'),
  prevFdPerPerson: document.getElementById('prevFdPerPerson'),
  prevOtHours: document.getElementById('prevOtHours'),
  prevOtStatus: document.getElementById('prevOtStatus'),
  prevStatusBanner: document.getElementById('prevStatusBanner'),
  prevStatusIcon: document.getElementById('prevStatusIcon'),
  prevStatusText: document.getElementById('prevStatusText'),
  prevCrewCountText: document.getElementById('prevCrewCountText'),
  prevCrewTableBody: document.getElementById('prevCrewTableBody'),
  prevTotalFdPayout: document.getElementById('prevTotalFdPayout'),
  prevTotalOtPayout: document.getElementById('prevTotalOtPayout'),

  // OT Statement & Period Mode Elements
  btnOtPeriodMonth: document.getElementById('btnOtPeriodMonth'),
  btnOtPeriodYear: document.getElementById('btnOtPeriodYear'),
  otPeriodModeHint: document.getElementById('otPeriodModeHint'),
  otMonthlyContainer: document.getElementById('otMonthlyContainer'),
  otYearlyContainer: document.getElementById('otYearlyContainer'),
  btnOtPrevMonth: document.getElementById('btnOtPrevMonth'),
  btnOtNextMonth: document.getElementById('btnOtNextMonth'),
  otYearSelect: document.getElementById('otYearSelect'),
  otYearCrewFilter: document.getElementById('otYearCrewFilter'),
  btnExportYearlyExcel: document.getElementById('btnExportYearlyExcel'),
  kpiYearOtHours: document.getElementById('kpiYearOtHours'),
  kpiYearOtAmount: document.getElementById('kpiYearOtAmount'),
  kpiYearTrips: document.getElementById('kpiYearTrips'),
  kpiYearPeakMonth: document.getElementById('kpiYearPeakMonth'),
  kpiYearHoursSub: document.getElementById('kpiYearHoursSub'),
  kpiYearCrewCount: document.getElementById('kpiYearCrewCount'),
  otYearMonthsTableBody: document.getElementById('otYearMonthsTableBody'),
  otYearMonthsTableFoot: document.getElementById('otYearMonthsTableFoot'),
  otYearCrewTableBody: document.getElementById('otYearCrewTableBody'),
  otYearCrewTableFoot: document.getElementById('otYearCrewTableFoot'),
  annualYearLabel: document.getElementById('annualYearLabel'),
  otStatementMonth: document.getElementById('otStatementMonth'),
  otStatementEmployee: document.getElementById('otStatementEmployee'),
  btnExportOtPdf: document.getElementById('btnExportOtPdf'),
  btnExportOtExcel: document.getElementById('btnExportOtExcel'),
  otEmpMetaBox: document.getElementById('otEmpMetaBox'),
  kpiOtTotalHours: document.getElementById('kpiOtTotalHours'),
  kpiOtHourlyRate: document.getElementById('kpiOtHourlyRate'),
  kpiOtTotalAmount: document.getElementById('kpiOtTotalAmount'),
  kpiOtDutyDays: document.getElementById('kpiOtDutyDays'),
  otStatementTableBody: document.getElementById('otStatementTableBody'),
  otStatementTableFoot: document.getElementById('otStatementTableFoot'),

  // FDE Statement
  fdeStatementMonth: document.getElementById('fdeStatementMonth'),
  fdeStatementEmployee: document.getElementById('fdeStatementEmployee'),
  btnExportFdePdf: document.getElementById('btnExportFdePdf'),
  btnExportFdeExcel: document.getElementById('btnExportFdeExcel'),
  fdeEmpMetaBox: document.getElementById('fdeEmpMetaBox'),
  kpiFdeTotalHours: document.getElementById('kpiFdeTotalHours'),
  kpiFdeTotalShifts: document.getElementById('kpiFdeTotalShifts'),
  kpiFdeTotalAmount: document.getElementById('kpiFdeTotalAmount'),
  fdeStatementTableBody: document.getElementById('fdeStatementTableBody'),
  fdeStatementTableFoot: document.getElementById('fdeStatementTableFoot'),

  // All Jobs & Roster
  otAllJobsSearch: document.getElementById('otAllJobsSearch'),
  otAllJobsTableBody: document.getElementById('otAllJobsTableBody'),
  otRosterTableBody: document.getElementById('otRosterTableBody'),

  // Edit Employee & Promotion Modal
  otEditEmployeeModal: document.getElementById('otEditEmployeeModal'),
  otEditEmployeeForm: document.getElementById('otEditEmployeeForm'),
  otEditEmpCode: document.getElementById('otEditEmpCode'),
  otModalActiveMode: document.getElementById('otModalActiveMode'),
  otEditEmpName: document.getElementById('otEditEmpName'),
  otEditEmpCpf: document.getElementById('otEditEmpCpf'),
  otEditEmpDesignation: document.getElementById('otEditEmpDesignation'),
  otEditEmpBasicPay: document.getElementById('otEditEmpBasicPay'),
  otEditEmpDa: document.getElementById('otEditEmpDa'),
  otEditCalculatedRate: document.getElementById('otEditCalculatedRate'),
  otEditEmpHeader: document.getElementById('otEditEmpHeader'),
  otEditEmpCodeBadge: document.getElementById('otEditEmpCodeBadge'),
  otEditEmpCpfDisplay: document.getElementById('otEditEmpCpfDisplay'),
  otEditEmpCurrentDesig: document.getElementById('otEditEmpCurrentDesig'),
  otEditCurrentOtRateBadge: document.getElementById('otEditCurrentOtRateBadge'),
  btnTabModalProfile: document.getElementById('btnTabModalProfile'),
  btnTabModalPromotion: document.getElementById('btnTabModalPromotion'),
  secModalProfile: document.getElementById('secModalProfile'),
  secModalPromotion: document.getElementById('secModalPromotion'),
  otPromoTargetDesignation: document.getElementById('otPromoTargetDesignation'),
  otPromoAutoIncrementCheck: document.getElementById('otPromoAutoIncrementCheck'),
  otPromoIncrementExplainer: document.getElementById('otPromoIncrementExplainer'),
  otPromoNewBasicPay: document.getElementById('otPromoNewBasicPay'),
  otPromoDate: document.getElementById('otPromoDate'),
  otPromoOrderNo: document.getElementById('otPromoOrderNo'),
  otPromoRemarks: document.getElementById('otPromoRemarks'),
  otRateDeltaBadge: document.getElementById('otRateDeltaBadge'),
  btnSaveEditEmp: document.getElementById('btnSaveEditEmp'),
  btnCloseEditEmpModal: document.getElementById('btnCloseEditEmpModal'),
  btnCancelEditEmpModal: document.getElementById('btnCancelEditEmpModal'),
  btnToggleRetireEmployee: document.getElementById('btnToggleRetireEmployee'),
  btnDeleteEmployee: document.getElementById('btnDeleteEmployee'),
  otEditStatusText: document.getElementById('otEditStatusText'),

  // Add Employee Modal & Roster Filters
  btnOpenAddEmployeeModal: document.getElementById('btnOpenAddEmployeeModal'),
  btnRosterFilterActive: document.getElementById('btnRosterFilterActive'),
  btnRosterFilterRetired: document.getElementById('btnRosterFilterRetired'),
  btnRosterFilterAll: document.getElementById('btnRosterFilterAll'),
  otAddEmployeeModal: document.getElementById('otAddEmployeeModal'),
  otAddEmployeeForm: document.getElementById('otAddEmployeeForm'),
  otAddEmpCode: document.getElementById('otAddEmpCode'),
  otAddEmpName: document.getElementById('otAddEmpName'),
  otAddEmpCpf: document.getElementById('otAddEmpCpf'),
  otAddEmpDesignation: document.getElementById('otAddEmpDesignation'),
  otAddEmpBasicPay: document.getElementById('otAddEmpBasicPay'),
  otAddEmpDa: document.getElementById('otAddEmpDa'),
  otAddEmpSection: document.getElementById('otAddEmpSection'),
  otAddEmpLocation: document.getElementById('otAddEmpLocation'),
  otAddCalculatedRate: document.getElementById('otAddCalculatedRate'),
  btnSaveAddEmp: document.getElementById('btnSaveAddEmp'),
  btnCloseAddEmpModal: document.getElementById('btnCloseAddEmpModal'),
  btnCancelAddEmpModal: document.getElementById('btnCancelAddEmpModal'),

  toastContainer: document.getElementById('toastContainer')
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================
// ENTERPRISE AUTHENTICATION SYSTEM & SESSION CONTROLLER
// ============================================================
function checkAuthStatus() {
  if (!elements.loginScreen) return;

  const stored = localStorage.getItem('ongc_auth_user') || sessionStorage.getItem('ongc_auth_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user && user.userId) {
        appState.isAuthenticated = true;
        appState.currentUser = user;
        applyAuthenticatedUser(user);
        elements.loginScreen.classList.add('hidden');
        return;
      }
    } catch (e) {
      console.warn('Failed to parse stored auth user:', e);
    }
  }

  // If not authenticated, ensure login screen is visible
  appState.isAuthenticated = false;
  appState.currentUser = null;
  elements.loginScreen.classList.remove('hidden');
}

function applyAuthenticatedUser(user) {
  if (elements.shellUserAvatar) {
    elements.shellUserAvatar.textContent = user.initials || 'UC';
    elements.shellUserAvatar.title = `${user.name} (${user.role || 'ONGC Logistics'})`;
  }
  // Sync to local storage for Admin Control Center access
  if (user) {
    localStorage.setItem('ongc_current_user', JSON.stringify(user));
  }
  const adminNavBtn = document.getElementById('btnHeaderAdminPanel');
  if (adminNavBtn) {
    adminNavBtn.style.display = (user && user.isAdmin) ? 'inline-flex' : 'none';
  }
}

// Form submit login handler
if (elements.loginForm) {
  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = elements.loginUserId.value.trim();
    const password = elements.loginPassword.value.trim();

    if (!userId || !password) {
      showLoginAlert('Please enter both User ID and Password.');
      return;
    }

    // Disable submit button while logging in
    if (elements.btnSubmitLogin) {
      elements.btnSubmitLogin.disabled = true;
      elements.btnSubmitLogin.innerHTML = 'Signing In...';
    }
    clearLoginAlert();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      });

      const data = await res.json();
      if (data.success && data.user) {
        appState.isAuthenticated = true;
        appState.currentUser = data.user;

        // Remember Me option
        if (elements.rememberMe && elements.rememberMe.checked) {
          localStorage.setItem('ongc_auth_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('ongc_auth_user', JSON.stringify(data.user));
          localStorage.removeItem('ongc_auth_user');
    localStorage.removeItem('ongc_current_user');
    const _adminBtn = document.getElementById('btnHeaderAdminPanel');
    if (_adminBtn) _adminBtn.style.display = 'none';
        }

        applyAuthenticatedUser(data.user);
        elements.loginScreen.classList.add('hidden');
        showToast(data.message || `Welcome back, ${data.user.name}!`, 'success');
      } else {
        showLoginAlert(data.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      // Fallback local verification in case of offline/network issues
      const cleanU = userId.trim().toUpperCase();
      const cleanP = password.trim();
      const cleanPUpper = cleanP.toUpperCase();

      const isUserMatch = cleanU === 'CPF-140751' || cleanU === '140751' || cleanU === 'CPF140751' || cleanU === 'UTJJAL CHETIA' || cleanU === 'UTJJAL.CHUTIA' || cleanU === 'ADMIN';
      const isPassMatch = cleanPUpper === 'CPF-140751' || cleanP === '140751' || cleanP === 'ongc@123' || cleanP === 'admin123';

      if (isUserMatch && isPassMatch) {
        const fallbackUser = {
          userId: cleanU === 'ADMIN' ? 'admin' : 'CPF-140751',
          name: cleanU === 'ADMIN' ? 'Operations Admin' : 'UTJJAL CHETIA',
          role: 'Reservoir Winch Logistics Officer (Assam Asset)',
          initials: cleanU === 'ADMIN' ? 'OA' : 'UC'
        };
        appState.isAuthenticated = true;
        appState.currentUser = fallbackUser;
        localStorage.setItem('ongc_auth_user', JSON.stringify(fallbackUser));
        applyAuthenticatedUser(fallbackUser);
        elements.loginScreen.classList.add('hidden');
        showToast(`Welcome back, ${fallbackUser.name}!`, 'success');
        return;
      }
      showLoginAlert('Authentication server error: ' + err.message);
    } finally {
      if (elements.btnSubmitLogin) {
        elements.btnSubmitLogin.disabled = false;
        elements.btnSubmitLogin.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          Sign In to Operations Portal
        `;
      }
    }
  });
}

function showLoginAlert(msg) {
  if (elements.loginAlertBox) {
    elements.loginAlertBox.textContent = msg;
    elements.loginAlertBox.style.display = 'block';
  }
}

function clearLoginAlert() {
  if (elements.loginAlertBox) {
    elements.loginAlertBox.textContent = '';
    elements.loginAlertBox.style.display = 'none';
  }
}

// Quick Autofill Hint Clickers
if (elements.hintUserId) {
  elements.hintUserId.addEventListener('click', () => {
    if (elements.loginUserId) {
      elements.loginUserId.value = 'CPF-140751';
      elements.loginUserId.focus();
    }
  });
}
if (elements.hintPassword) {
  elements.hintPassword.addEventListener('click', () => {
    if (elements.loginPassword) {
      elements.loginPassword.value = 'CPF-140751';
      elements.loginPassword.focus();
    }
  });
}

// Password toggle eye icon
if (elements.btnTogglePassword && elements.loginPassword) {
  elements.btnTogglePassword.addEventListener('click', () => {
    const isPass = elements.loginPassword.type === 'password';
    elements.loginPassword.type = isPass ? 'text' : 'password';
    if (elements.eyeIcon) {
      elements.eyeIcon.innerHTML = isPass
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
  });
}

// Sign Out Handler
if (elements.btnSignOut) {
  elements.btnSignOut.addEventListener('click', () => {
    localStorage.removeItem('ongc_auth_user');
    sessionStorage.removeItem('ongc_auth_user');
    appState.isAuthenticated = false;
    appState.currentUser = null;
    clearLoginAlert();
    if (elements.loginUserId) elements.loginUserId.value = '';
    if (elements.loginPassword) elements.loginPassword.value = '';
    if (elements.loginScreen) elements.loginScreen.classList.remove('hidden');
    showToast('Signed out of operations portal.', 'info');
  });
}


// ============================================================
// THEME CONTROLLER (4-Theme System)
// Themes: dark-blue, light, green, red
// ============================================================
const THEMES = {
  'dark-blue': { label: 'Dark Blue', color: 'linear-gradient(135deg, #1b3248, #0070f2)' },
  'light':     { label: 'Light',     color: 'linear-gradient(135deg, #4a627a, #f1f5f9)' },
  'green':     { label: 'Green',     color: 'linear-gradient(135deg, #0d2618, #059669)' },
  'red':       { label: 'Crimson',   color: 'linear-gradient(135deg, #2d0808, #dc2626)' },
};

function applyTheme(themeName) {
  if (!THEMES[themeName]) themeName = 'dark-blue';
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('ongc_theme', themeName);
  updateThemePickerUI(themeName);
  // Close panel after selection
  const panel = document.getElementById('themePickerPanel');
  if (panel) panel.classList.remove('open');
}

function updateThemePickerUI(themeName) {
  // Update the dot preview color
  const dot = document.getElementById('themeIcon');
  if (dot) {
    dot.style.background = THEMES[themeName]?.color || '#0070f2';
  }
  // Update label
  const lbl = document.getElementById('themeLabel');
  if (lbl) lbl.textContent = THEMES[themeName]?.label || 'Theme';
  
  // Update active state on option buttons
  const optMap = {
    'dark-blue': 'themeOptDarkBlue',
    'light': 'themeOptLight',
    'green': 'themeOptGreen',
    'red': 'themeOptRed',
  };
  Object.entries(optMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('active-theme', key === themeName);
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('ongc_theme') || 'dark-blue';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemePickerUI(savedTheme);
}

// Theme picker panel open/close
const btnThemeToggleEl = document.getElementById('btnThemeToggle');
const themePickerPanelEl = document.getElementById('themePickerPanel');

if (btnThemeToggleEl && themePickerPanelEl) {
  btnThemeToggleEl.addEventListener('click', (e) => {
    e.stopPropagation();
    themePickerPanelEl.classList.toggle('open');
  });
}

// Close theme picker when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('themePickerWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    if (themePickerPanelEl) themePickerPanelEl.classList.remove('open');
  }
});

// Make applyTheme globally accessible (called from HTML onclick)
window.applyTheme = applyTheme;



// ============================================================
// DATA FETCHING & SYNC
// ============================================================
async function fetchCurrentData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    if (data.success) {
      updateState(data);
    }
  } catch (err) {
    showToast('Failed to connect to ONGC server: ' + err.message, 'error');
  }
}

function updateState(data) {
  appState.vehicles = data.vehicles || [];
  appState.fleetSummary = data.fleetSummary || {};
  appState.dieselIssuedRecords = data.dieselIssuedRecords || [];
  appState.loadedFile = data.loadedFile || null;

  // Set default active vehicle if none set or invalidated
  if (!appState.activeVehicleId && appState.vehicles.length > 0) {
    appState.activeVehicleId = appState.vehicles[0].id;
  } else if (!appState.vehicles.some(v => v.id === appState.activeVehicleId) && appState.vehicles.length > 0) {
    appState.activeVehicleId = appState.vehicles[0].id;
  }

  // Set default active batch
  const currentVehicle = getActiveVehicle();
  if (currentVehicle && currentVehicle.batches.length > 0) {
    if (!appState.activeBatchId || !currentVehicle.batches.some(b => b.id === appState.activeBatchId)) {
      appState.activeBatchId = currentVehicle.batches[currentVehicle.batches.length - 1].id;
    }
  } else {
    appState.activeBatchId = null;
  }

  renderAll();
}

function getActiveVehicle() {
  return appState.vehicles.find(v => v.id === appState.activeVehicleId);
}

function getActiveBatch() {
  const vehicle = getActiveVehicle();
  if (!vehicle) return null;
  return vehicle.batches.find(b => b.id === appState.activeBatchId) || vehicle.batches[0];
}

// ============================================================
// RENDERING FUNCTIONS
// ============================================================
function renderAll() {
  renderStatusBanner();
  renderFleetKpis();
  renderVehicleTabs();
  renderVehicleDetails();
  renderBatchSummary();
  renderDirectEntryPanel();
  renderTripTable();
}

function renderStatusBanner() {
  if (appState.loadedFile) {
    elements.loadedFileName.textContent = `Active File: ${appState.loadedFile}`;
    elements.loadedFileBadge.textContent = 'Loaded';
    elements.loadedFileBadge.style.background = 'var(--success-light)';
    elements.loadedFileBadge.style.color = 'var(--success)';
  } else {
    elements.loadedFileName.textContent = 'No file loaded. Click "Load Autosaved File" to load the logbook.';
    elements.loadedFileBadge.textContent = 'Standby';
    elements.loadedFileBadge.style.background = 'var(--primary-light)';
    elements.loadedFileBadge.style.color = 'var(--primary)';
  }
}

function renderFleetKpis() {
  const s = appState.fleetSummary || {};
  elements.kpiFleetVehicles.textContent = s.totalVehicles || 0;
  elements.kpiFleetIssued.textContent = (s.totalIssued || 0).toLocaleString();
  elements.kpiFleetDistance.textContent = (s.totalDistance || 0).toLocaleString();
  elements.kpiFleetEngine.textContent = (s.totalEngineHours || 0).toLocaleString();
  elements.kpiFleetConsumed.textContent = (s.totalConsumed || 0).toLocaleString();
  elements.kpiFleetBalance.textContent = (s.fleetBalance || 0).toLocaleString();

  if (elements.navFleetCount) {
    elements.navFleetCount.textContent = `${s.totalVehicles || appState.vehicles.length || 4} Winches`;
  }

  if (s.fleetBalance < 30) {
    elements.kpiFleetBalanceWrap.style.color = 'var(--danger)';
  } else {
    elements.kpiFleetBalanceWrap.style.color = 'var(--success)';
  }
}

function renderVehicleTabs() {
  elements.vehicleTabsContainer.innerHTML = '';
  appState.vehicles.forEach(vehicle => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${vehicle.id === appState.activeVehicleId ? 'active' : ''}`;
    btn.innerHTML = `
      <span>${vehicle.name}</span>
      <span class="tab-badge">${vehicle.totals ? vehicle.totals.totalTrips : 0}</span>
    `;
    btn.addEventListener('click', () => {
      appState.activeVehicleId = vehicle.id;
      const curV = getActiveVehicle();
      if (curV && curV.batches.length > 0) {
        appState.activeBatchId = curV.batches[curV.batches.length - 1].id;
      }
      renderAll();
      resetScrollToTop();
    });
    elements.vehicleTabsContainer.appendChild(btn);
  });
}

function renderVehicleDetails() {
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    elements.activeVehicleTitle.textContent = 'No Vehicle Selected';
    elements.activeVehicleTripsCount.textContent = '0 Trips';
    elements.batchSelect.innerHTML = '<option value="">No batches</option>';
    return;
  }

  elements.activeVehicleTitle.textContent = vehicle.name;
  elements.activeVehicleType.textContent = vehicle.type || 'Reservoir Winch';
  elements.activeVehicleTripsCount.textContent = `${vehicle.totals ? vehicle.totals.totalTrips : 0} Trips Logged`;

  // Populate Batch Select dropdown
  elements.batchSelect.innerHTML = '';
  (vehicle.batches || []).forEach((b, idx) => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `Batch #${idx + 1} (${b.year || 'Year'}) • Issue: ${b.issueDate || 'N/A'} • Qty: ${b.issuedQty}L [${b.entries.length} trips]`;
    if (b.id === appState.activeBatchId) {
      opt.selected = true;
    }
    elements.batchSelect.appendChild(opt);
  });

  // Update PDF Modal options
  elements.pdfVehicleOptionLabel.textContent = `Vehicle Report: ${vehicle.name}`;
  const batch = getActiveBatch();
  if (batch) {
    elements.pdfBatchOptionLabel.textContent = `Batch #${batch.batchNumber} Report (${batch.issueDate || 'N/A'}) - ${vehicle.name}`;
  }
}

elements.batchSelect.addEventListener('change', (e) => {
  appState.activeBatchId = e.target.value;
  renderBatchSummary();
  renderTripTable();
});

function renderBatchSummary() {
  const batch = getActiveBatch();
  if (!batch) {
    elements.cardIssueQty.innerHTML = `0 <span class="rate-unit">L</span>`;
    elements.cardIssueDate.textContent = `Date: N/A`;
    elements.cardRoadDist.innerHTML = `0 <span class="rate-unit">km</span>`;
    elements.cardTruckAvg.textContent = `3`;
    elements.cardRoadLiters.textContent = `0`;
    elements.cardEngineHours.innerHTML = `0 <span class="rate-unit">hrs</span>`;
    elements.cardEngineAvg.textContent = `4`;
    elements.cardEngineLiters.textContent = `0`;
    elements.cardTotalConsumed.innerHTML = `0 <span class="rate-unit">L</span>`;
    elements.cardSurplusStock.innerHTML = `0 <span class="rate-unit">L</span>`;
    elements.cardBalanceStatus.textContent = 'No batch data';
    return;
  }

  elements.cardIssueQty.innerHTML = `${batch.issuedQty} <span class="rate-unit">L</span>`;
  elements.cardIssueDate.textContent = `Issue Date: ${batch.issueDate || 'N/A'}`;
  elements.cardRoadDist.innerHTML = `${batch.totalDistance} <span class="rate-unit">km</span>`;
  elements.cardTruckAvg.textContent = batch.truckAvg;
  elements.cardRoadLiters.textContent = batch.roadConsumption;
  elements.cardEngineHours.innerHTML = `${batch.totalEngineHours} <span class="rate-unit">hrs</span>`;
  elements.cardEngineAvg.textContent = batch.engineAvg;
  elements.cardEngineLiters.textContent = batch.engineConsumption;
  elements.cardTotalConsumed.innerHTML = `${batch.totalConsumed} <span class="rate-unit">L</span>`;
  elements.cardSurplusStock.innerHTML = `${batch.surplusStock} <span class="rate-unit">L</span>`;

  // Reserve Alert logic (30 Liter air locking safety threshold)
  if (batch.surplusStock < 30) {
    elements.cardSurplusStock.style.color = 'var(--danger)';
    elements.cardBalanceStatus.textContent = 'CRITICAL: Below 30L Reserve!';
    elements.cardBalanceStatus.style.color = 'var(--danger)';
    elements.reserveAlertBar.className = 'reserve-alert-bar reserve-alert-warning';
    elements.reserveAlertText.textContent = `* ALERT: Remaining diesel (${batch.surplusStock} L) is BELOW the required 30 Litre safety reserve! Refill required to avoid air locking.`;
  } else {
    elements.cardSurplusStock.style.color = 'var(--success)';
    elements.cardBalanceStatus.textContent = 'Safe Operational Margin';
    elements.cardBalanceStatus.style.color = 'var(--success)';
    elements.reserveAlertBar.className = 'reserve-alert-bar reserve-alert-ok';
    elements.reserveAlertText.textContent = `* 30 LITER DIESEL SHOULD BE KEPT AS RESERVE TO AVOID AIR LOCKING. (Current Stock: ${batch.surplusStock} L - OK)`;
  }
}

function renderDirectEntryPanel() {
  if (!elements.directVehicleSelect) return;

  const currentSelectedVehicle = elements.directVehicleSelect.value || appState.activeVehicleId;

  elements.directVehicleSelect.innerHTML = '';
  appState.vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.type || 'Reservoir Winch'})`;
    if (v.id === currentSelectedVehicle) {
      opt.selected = true;
    }
    elements.directVehicleSelect.appendChild(opt);
  });

  populateDirectBatches(currentSelectedVehicle);

  if (!elements.directDate.value) {
    elements.directDate.value = new Date().toISOString().slice(0, 10);
  }

  updateDirectCalcPreview();
}

function populateDirectBatches(vehicleId) {
  if (!elements.directBatchSelect) return;
  const vehicle = appState.vehicles.find(v => v.id === vehicleId);
  elements.directBatchSelect.innerHTML = '';
  if (!vehicle || !vehicle.batches || vehicle.batches.length === 0) {
    elements.directBatchSelect.innerHTML = '<option value="">No active batches</option>';
    return;
  }

  const currentBatchId = elements.directBatchSelect.value || appState.activeBatchId;
  vehicle.batches.forEach((b, idx) => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `Batch #${idx + 1} (${b.year || 'Year'}) • Issue: ${b.issueDate || 'N/A'} • Qty: ${b.issuedQty}L`;
    if (b.id === currentBatchId || (!currentBatchId && idx === vehicle.batches.length - 1)) {
      opt.selected = true;
    }
    elements.directBatchSelect.appendChild(opt);
  });
}

function updateDirectCalcPreview() {
  if (!elements.previewTotalHSD) return;
  const dist = parseFloat(elements.directDistance.value) || 0;
  const hrs = parseFloat(elements.directEngineHours.value) || 0;

  const vehicleId = elements.directVehicleSelect.value || appState.activeVehicleId;
  const batchId = elements.directBatchSelect.value || appState.activeBatchId;

  const vehicle = appState.vehicles.find(v => v.id === vehicleId);
  let truckAvg = 3.0;
  let engineAvg = 4.0;
  if (vehicle && vehicle.batches) {
    const b = vehicle.batches.find(x => x.id === batchId) || vehicle.batches[vehicle.batches.length - 1];
    if (b) {
      if (b.truckAvg > 0) truckAvg = b.truckAvg;
      if (b.engineAvg > 0) engineAvg = b.engineAvg;
    }
  }

  const roadL = truckAvg > 0 ? dist / truckAvg : 0;
  const engL = hrs * engineAvg;
  const totalL = roadL + engL;

  elements.previewRoadL.textContent = (Math.round(roadL * 10) / 10).toFixed(1);
  elements.previewEngineL.textContent = (Math.round(engL * 10) / 10).toFixed(1);
  elements.previewTotalHSD.textContent = `${(Math.round(totalL * 10) / 10).toFixed(1)} L`;
}

function renderTripTable() {
  const batch = getActiveBatch();
  elements.tripEntriesTableBody.innerHTML = '';

  if (!batch || !batch.entries || batch.entries.length === 0) {
    elements.tripEntriesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
          No trip entries in this batch yet. Click "<strong>Add Trip Log Entry</strong>" above to add your first movement.
        </td>
      </tr>
    `;
    elements.entriesCountText.textContent = '0 entries';
    return;
  }

  // Filter entries if search query is active
  const q = appState.searchQuery.toLowerCase().trim();
  const filtered = batch.entries.filter(e => {
    if (!q) return true;
    return (
      (e.date && e.date.toLowerCase().includes(q)) ||
      (e.details && e.details.toLowerCase().includes(q)) ||
      (e.job && e.job.toLowerCase().includes(q)) ||
      (e.remarks && e.remarks.toLowerCase().includes(q))
    );
  });

  elements.entriesCountText.textContent = `Showing ${filtered.length} of ${batch.entries.length} entries`;

  filtered.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(entry.date || '-')}</strong></td>
      <td>${escapeHtml(entry.details || '-')}</td>
      <td class="text-right"><strong>${entry.distance !== undefined ? entry.distance : 0}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(entry.job || '-')}</span></td>
      <td class="text-right"><strong>${entry.engineHours !== undefined ? entry.engineHours : 0}</strong></td>
      <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(entry.remarks || '-')}</td>
      <td class="text-center">
        <div class="table-row-actions">
          <button class="btn-table-action edit" title="Edit trip entry" data-id="${entry.id}">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-table-action delete" title="Delete trip entry" data-id="${entry.id}">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Row Edit
    tr.querySelector('.btn-table-action.edit').addEventListener('click', () => {
      openEditEntryModal(entry);
    });

    // Row Delete
    tr.querySelector('.btn-table-action.delete').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete this trip log entry on ${entry.date}?`)) {
        await deleteEntry(entry.id);
      }
    });

    elements.tripEntriesTableBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Search Handler
elements.searchInput.addEventListener('input', (e) => {
  appState.searchQuery = e.target.value;
  renderTripTable();
});

// Quick tags fill
document.querySelectorAll('.quick-fill').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = el.getAttribute('data-target');
    const val = el.getAttribute('data-val');
    const input = document.getElementById(targetId);
    if (input) {
      input.value = val;
      input.focus();
    }
  });
});

// ============================================================
// MODAL CONTROLS & API ACTIONS
// ============================================================

// 1. Add / Edit Entry
elements.btnOpenAddEntryModal.addEventListener('click', () => {
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    showToast('Please select or register a vehicle first.', 'error');
    return;
  }
  const batch = getActiveBatch();
  if (!batch) {
    showToast('Please create a diesel indent batch first.', 'error');
    return;
  }

  elements.entryModalTitle.textContent = `Add Trip Log Entry (${vehicle.name})`;
  elements.entryModalId.value = '';
  elements.entryDate.value = new Date().toISOString().slice(0, 10);
  elements.entryDistance.value = '0';
  elements.entryDetails.value = '';
  elements.entryJob.value = 'FBHP';
  elements.entryEngineHours.value = '1';
  elements.entryRemarks.value = '';
  openModal(elements.entryModal);
});

function openEditEntryModal(entry) {
  const vehicle = getActiveVehicle();
  elements.entryModalTitle.textContent = `Edit Trip Log Entry (${vehicle.name})`;
  elements.entryModalId.value = entry.id;
  elements.entryDate.value = entry.date || '';
  elements.entryDistance.value = entry.distance || 0;
  elements.entryDetails.value = entry.details || '';
  elements.entryJob.value = entry.job || '';
  elements.entryEngineHours.value = entry.engineHours || 0;
  elements.entryRemarks.value = entry.remarks || '';
  openModal(elements.entryModal);
}

elements.entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const vehicle = getActiveVehicle();
  const batch = getActiveBatch();
  const entryId = elements.entryModalId.value;

  const payload = {
    vehicleId: vehicle.id,
    batchId: batch.id,
    date: elements.entryDate.value,
    distance: parseFloat(elements.entryDistance.value) || 0,
    details: elements.entryDetails.value.trim(),
    job: elements.entryJob.value.trim(),
    engineHours: parseFloat(elements.entryEngineHours.value) || 0,
    remarks: elements.entryRemarks.value.trim()
  };

  try {
    let res;
    if (entryId) {
      payload.entryId = entryId;
      res = await fetch('/api/entry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    const data = await res.json();
    if (data.success) {
      updateState(data);
      closeModal(elements.entryModal);
      showToast(entryId ? 'Trip log updated successfully' : 'Trip log entry added successfully', 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to save entry: ' + err.message, 'error');
  }
});

async function deleteEntry(entryId) {
  const vehicle = getActiveVehicle();
  const batch = getActiveBatch();
  try {
    const res = await fetch(`/api/entry?vehicleId=${vehicle.id}&batchId=${batch.id}&entryId=${entryId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      updateState(data);
      showToast('Entry deleted successfully', 'success');
    } else {
      showToast('Error deleting entry: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

// 2. Add New Batch
elements.btnOpenAddBatchModal.addEventListener('click', () => {
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    showToast('Please select or register a vehicle first.', 'error');
    return;
  }
  elements.batchIssueDate.value = new Date().toISOString().slice(0, 10);
  openModal(elements.batchModal);
});

elements.batchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const vehicle = getActiveVehicle();
  const payload = {
    vehicleId: vehicle.id,
    year: elements.batchYear.value.trim(),
    issueDate: elements.batchIssueDate.value,
    issuedQty: parseFloat(elements.batchIssuedQty.value) || 0,
    truckAvg: parseFloat(elements.batchTruckAvg.value) || 3.0,
    engineAvg: parseFloat(elements.batchEngineAvg.value) || 4.0,
    remarks: elements.batchRemarks.value.trim()
  };

  try {
    const res = await fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      appState.activeBatchId = data.batch.id;
      updateState(data);
      closeModal(elements.batchModal);
      showToast('New diesel indent batch created!', 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to create batch: ' + err.message, 'error');
  }
});

// 3. Edit Batch Settings
elements.btnEditBatchSettings.addEventListener('click', () => {
  const batch = getActiveBatch();
  if (!batch) return;
  elements.settingsYear.value = batch.year || '';
  elements.settingsIssueDate.value = batch.issueDate || '';
  elements.settingsIssuedQty.value = batch.issuedQty || 0;
  elements.settingsTruckAvg.value = batch.truckAvg || 3;
  elements.settingsEngineAvg.value = batch.engineAvg || 4;
  openModal(elements.settingsModal);
});

elements.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const vehicle = getActiveVehicle();
  const batch = getActiveBatch();
  const payload = {
    vehicleId: vehicle.id,
    batchId: batch.id,
    year: elements.settingsYear.value.trim(),
    issueDate: elements.settingsIssueDate.value.trim(),
    issuedQty: parseFloat(elements.settingsIssuedQty.value) || 0,
    truckAvg: parseFloat(elements.settingsTruckAvg.value) || 3,
    engineAvg: parseFloat(elements.settingsEngineAvg.value) || 4
  };

  try {
    const res = await fetch('/api/batch-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      updateState(data);
      closeModal(elements.settingsModal);
      showToast('Batch settings updated and recalculated!', 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to update settings: ' + err.message, 'error');
  }
});

// 4. Add New Vehicle
elements.btnOpenAddVehicleModal.addEventListener('click', () => {
  elements.vehicleRegName.value = '';
  openModal(elements.vehicleModal);
});

elements.vehicleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: elements.vehicleRegName.value.trim(),
    type: elements.vehicleType.value.trim()
  };

  try {
    const res = await fetch('/api/vehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      appState.activeVehicleId = data.vehicle.id;
      updateState(data);
      closeModal(elements.vehicleModal);
      showToast(`Vehicle ${data.vehicle.name} registered successfully!`, 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to register vehicle: ' + err.message, 'error');
  }
});

// 5. Load Default Autosaved File
if (elements.btnLoadDefault) {
  elements.btnLoadDefault.addEventListener('click', async () => {
    try {
      elements.btnLoadDefault.disabled = true;
      elements.btnLoadDefault.textContent = 'Loading...';
      const res = await fetch('/api/load-default');
      const data = await res.json();
      if (data.success) {
        updateState(data);
        showToast('ONGC Autosaved Excel file loaded successfully!', 'success');
      } else {
        showToast('Failed to load default file: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Error loading file: ' + err.message, 'error');
    } finally {
      elements.btnLoadDefault.disabled = false;
      elements.btnLoadDefault.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Load Autosaved File
      `;
    }
  });
}

// 6. Upload Custom Excel File
if (elements.fileInput) {
  elements.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      showToast(`Uploading and parsing ${file.name}...`, 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        updateState(data);
        showToast(`Successfully parsed ${file.name}!`, 'success');
      } else {
        showToast('Failed to parse: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Upload error: ' + err.message, 'error');
    } finally {
      elements.fileInput.value = '';
    }
  });
}

// 7. Export Excel (.xlsx)
if (elements.btnExportExcel) {
  elements.btnExportExcel.addEventListener('click', () => {
    if (appState.vehicles.length === 0) {
      showToast('No vehicle data available to export.', 'error');
      return;
    }
    showToast('Generating formatted Excel file...', 'info');
    window.location.href = '/api/export/excel';
  });
}

// 8. Export PDF (.pdf)
if (elements.btnOpenPdfModal) {
  elements.btnOpenPdfModal.addEventListener('click', () => {
    if (appState.vehicles.length === 0) {
      showToast('No vehicle data available to export.', 'error');
      return;
    }
    openModal(elements.pdfModal);
  });
}

if (elements.btnDownloadPdfConfirm) {
  elements.btnDownloadPdfConfirm.addEventListener('click', () => {
    const selectedScope = document.querySelector('input[name="pdfScope"]:checked').value;
    let url = '/api/export/pdf';
    const vehicle = getActiveVehicle();
    const batch = getActiveBatch();

    if (selectedScope === 'vehicle' && vehicle) {
      url += `?vehicleId=${encodeURIComponent(vehicle.id)}`;
    } else if (selectedScope === 'batch' && vehicle && batch) {
      url += `?vehicleId=${encodeURIComponent(vehicle.id)}&batchId=${encodeURIComponent(batch.id)}`;
    }

    showToast('Generating official PDF report...', 'info');
    closeModal(elements.pdfModal);
    window.open(url, '_blank');
  });
}

// Modal Helpers
function openModal(m) {
  if (m) m.classList.add('open');
}

function closeModal(m) {
  if (m) m.classList.remove('open');
}

// Modal Close Listeners
if (elements.btnCloseEntryModal) elements.btnCloseEntryModal.addEventListener('click', () => closeModal(elements.entryModal));
if (elements.btnCancelEntryModal) elements.btnCancelEntryModal.addEventListener('click', () => closeModal(elements.entryModal));

if (elements.btnCloseBatchModal) elements.btnCloseBatchModal.addEventListener('click', () => closeModal(elements.batchModal));
if (elements.btnCancelBatchModal) elements.btnCancelBatchModal.addEventListener('click', () => closeModal(elements.batchModal));

if (elements.btnCloseSettingsModal) elements.btnCloseSettingsModal.addEventListener('click', () => closeModal(elements.settingsModal));
if (elements.btnCancelSettingsModal) elements.btnCancelSettingsModal.addEventListener('click', () => closeModal(elements.settingsModal));

if (elements.btnCloseVehicleModal) elements.btnCloseVehicleModal.addEventListener('click', () => closeModal(elements.vehicleModal));
if (elements.btnCancelVehicleModal) elements.btnCancelVehicleModal.addEventListener('click', () => closeModal(elements.vehicleModal));

if (elements.btnClosePdfModal) elements.btnClosePdfModal.addEventListener('click', () => closeModal(elements.pdfModal));
if (elements.btnCancelPdfModal) elements.btnCancelPdfModal.addEventListener('click', () => closeModal(elements.pdfModal));

// Close modal on outside click
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    closeModal(e.target);
  }
});

// Close modal on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => closeModal(m));
  }
});

// ============================================================
// DIRECT VEHICLE ENTRY PANEL EVENT LISTENERS
// ============================================================
if (elements.directEntryForm) {
  elements.directVehicleSelect.addEventListener('change', (e) => {
    const vId = e.target.value;
    appState.activeVehicleId = vId;
    const vehicle = getActiveVehicle();
    if (vehicle && vehicle.batches.length > 0) {
      appState.activeBatchId = vehicle.batches[vehicle.batches.length - 1].id;
    }
    populateDirectBatches(vId);
    renderAll();
  });

  elements.directBatchSelect.addEventListener('change', (e) => {
    appState.activeBatchId = e.target.value;
    elements.batchSelect.value = e.target.value;
    renderBatchSummary();
    renderTripTable();
    updateDirectCalcPreview();
  });

  elements.directDistance.addEventListener('input', updateDirectCalcPreview);
  elements.directEngineHours.addEventListener('input', updateDirectCalcPreview);

  elements.btnDirectClear.addEventListener('click', () => {
    elements.directDetails.value = '';
    elements.directJob.value = '';
    elements.directRemarks.value = '';
    elements.directDistance.value = '0';
    elements.directEngineHours.value = '0';
    updateDirectCalcPreview();
    showToast('Entry form cleared.', 'info');
  });

  elements.directEntryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vehicleId = elements.directVehicleSelect.value;
    const batchId = elements.directBatchSelect.value;
    const date = elements.directDate.value;
    const details = elements.directDetails.value.trim();
    const distance = parseFloat(elements.directDistance.value) || 0;
    const job = elements.directJob.value.trim();
    const engineHours = parseFloat(elements.directEngineHours.value) || 0;
    const remarks = elements.directRemarks.value.trim();

    if (!vehicleId) {
      showToast('Please select a vehicle first.', 'error');
      return;
    }
    if (!details) {
      showToast('Please enter movement details (From / To).', 'error');
      return;
    }

    const payload = {
      vehicleId,
      batchId,
      date,
      details,
      distance,
      job,
      engineHours,
      remarks
    };

    try {
      elements.btnDirectSubmit.disabled = true;
      elements.btnDirectSubmit.textContent = 'Saving...';
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        appState.activeVehicleId = vehicleId;
        appState.activeBatchId = batchId;
        updateState(data);
        showToast(`Trip entry saved for vehicle ${vehicleId}!`, 'success');

        // Clear row 2 inputs, keep date for fast sequential logging
        elements.directDetails.value = '';
        elements.directJob.value = '';
        elements.directRemarks.value = '';
        elements.directDistance.value = '0';
        elements.directEngineHours.value = '0';
        updateDirectCalcPreview();
      } else {
        showToast('Error saving entry: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to save entry: ' + err.message, 'error');
    } finally {
      elements.btnDirectSubmit.disabled = false;
      elements.btnDirectSubmit.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Save Entry
      `;
    }
  });
}

// Quick tag pills for direct entry
document.querySelectorAll('.tag-pill').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = el.getAttribute('data-target');
    const val = el.getAttribute('data-val');
    const input = document.getElementById(targetId);
    if (input) {
      input.value = val;
      input.focus();
    }
  });
});

// ============================================================
// ONGC WELL SITES & ROUTE ASSISTANT LOGIC
// ============================================================
async function fetchWellSites() {
  try {
    const res = await fetch('/api/well-sites');
    const data = await res.json();
    if (data.success) {
      appState.wellSiteData = data;
      if (elements.headerWellCountBadge) {
        elements.headerWellCountBadge.textContent = data.totalWells || 0;
      }
      if (elements.navWellCount) {
        elements.navWellCount.textContent = `${data.totalWells || 112} Wells`;
      }
      populateWellDatalist();
      renderWellSitesDirectory();
      renderMainWellSiteDirectory();
      renderSettingsClusterTable();
    }
  } catch (err) {
    console.error('Failed to load well sites:', err);
  }
}

function populateWellDatalist() {
  if (!elements.allWellSuggestions) return;
  elements.allWellSuggestions.innerHTML = '';

  // Common ONGC Bases & Installations
  const commonBases = [
    'JORHAT BASE',
    'BORHOLA BASE',
    'BR-GGS',
    'KHORAGHAT GGS-1',
    'KHORAGHAT GGS-2',
    'NR GGS',
    'BR PTYS',
    'CEMENTING OFFICE',
    'DTO OFFICE',
    'ANSARI WORKSHOP KENDUGURI',
    'KH GGS-II'
  ];

  commonBases.forEach(base => {
    const opt = document.createElement('option');
    opt.value = base;
    opt.textContent = 'Installation / Base';
    elements.allWellSuggestions.appendChild(opt);
  });

  // Add all 112 parsed wells from well site info.xlsx
  const wells = appState.wellSiteData.wells || [];
  wells.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.wellName;
    opt.textContent = `${w.clusterName} (${w.field})`;
    elements.allWellSuggestions.appendChild(opt);
  });
}

function renderWellSitesDirectory() {
  if (!elements.wellClusterGrid) return;

  const data = appState.wellSiteData;
  const fields = data.fields || [];
  const clusters = data.clusters || [];

  // 1. Render Field Filter Pills
  if (elements.fieldFilterBar) {
    elements.fieldFilterBar.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `field-pill ${appState.selectedWellField === 'ALL' ? 'active' : ''}`;
    allBtn.textContent = `All Fields (${data.totalWells || 0})`;
    allBtn.addEventListener('click', () => {
      appState.selectedWellField = 'ALL';
      renderWellSitesDirectory();
    });
    elements.fieldFilterBar.appendChild(allBtn);

    fields.forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `field-pill ${appState.selectedWellField === f.fieldName ? 'active' : ''}`;
      // Count wells in this field
      const fieldWells = (f.clusters || []).reduce((sum, c) => sum + (c.wells ? c.wells.length : 0), 0);
      btn.textContent = `${f.fieldName} (${fieldWells})`;
      btn.addEventListener('click', () => {
        appState.selectedWellField = f.fieldName;
        renderWellSitesDirectory();
      });
      elements.fieldFilterBar.appendChild(btn);
    });
  }

  // 2. Filter Clusters
  const q = (appState.wellSearchQuery || '').toLowerCase().trim();
  const filteredClusters = clusters.filter(c => {
    // Field filter
    if (appState.selectedWellField !== 'ALL' && c.field !== appState.selectedWellField) {
      return false;
    }
    // Search query
    if (q) {
      const matchCluster = c.clusterName.toLowerCase().includes(q);
      const matchField = c.field.toLowerCase().includes(q);
      const matchWell = (c.wells || []).some(w => w.toLowerCase().includes(q));
      return matchCluster || matchField || matchWell;
    }
    return true;
  });

  // Count total displayed wells
  const displayedWellsCount = filteredClusters.reduce((sum, c) => sum + (c.wells ? c.wells.length : 0), 0);
  if (elements.wellDirectoryCountText) {
    elements.wellDirectoryCountText.textContent = `Showing ${displayedWellsCount} wells across ${filteredClusters.length} clusters`;
  }

  // 3. Render Cluster Cards
  elements.wellClusterGrid.innerHTML = '';
  if (filteredClusters.length === 0) {
    elements.wellClusterGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
        No well sites found matching "<strong>${escapeHtml(q)}</strong>".
      </div>
    `;
    return;
  }

  filteredClusters.forEach(cluster => {
    const card = document.createElement('div');
    card.className = 'well-cluster-card';
    card.innerHTML = `
      <div class="well-cluster-header">
        <span class="well-cluster-title">${escapeHtml(cluster.clusterName)}</span>
        <span class="well-cluster-field-badge">${escapeHtml(cluster.field)}</span>
      </div>
      <div class="well-badges-list">
        ${(cluster.wells || []).map(w => `
          <button type="button" class="well-pill-interactive" title="Click to insert ${w} into movement details" data-well="${escapeHtml(w)}">
            ${escapeHtml(w)}
          </button>
        `).join('')}
      </div>
    `;

    // Click on any well pill inserts it into movement details
    card.querySelectorAll('.well-pill-interactive').forEach(pill => {
      pill.addEventListener('click', () => {
        const wellName = pill.getAttribute('data-well');
        insertWellIntoMovement(wellName);
      });
    });

    elements.wellClusterGrid.appendChild(card);
  });
}

function insertWellIntoMovement(wellName) {
  if (!elements.directDetails) return;
  const current = elements.directDetails.value.trim();
  if (!current) {
    elements.directDetails.value = wellName;
  } else if (!current.includes(' TO ')) {
    elements.directDetails.value = `${current} TO ${wellName}`;
  } else if (!current.includes('PARKED AT')) {
    elements.directDetails.value = `${current} AND PARKED AT ${wellName}`;
  } else {
    elements.directDetails.value = `${current}, ${wellName}`;
  }
  closeModal(elements.wellSitesModal);
  elements.directDetails.focus();
  showToast(`Inserted ${wellName} into movement details!`, 'info');
}

// Search Well Sites Input
if (elements.wellSearchInput) {
  elements.wellSearchInput.addEventListener('input', (e) => {
    appState.wellSearchQuery = e.target.value;
    renderWellSitesDirectory();
  });
}

// Modal open/close for Well Sites
if (elements.btnOpenWellSitesModal) {
  elements.btnOpenWellSitesModal.addEventListener('click', () => {
    openModal(elements.wellSitesModal);
  });
}
if (elements.btnBrowseAllWells) {
  elements.btnBrowseAllWells.addEventListener('click', () => {
    openModal(elements.wellSitesModal);
  });
}
if (elements.btnCloseWellSitesModal) {
  elements.btnCloseWellSitesModal.addEventListener('click', () => {
    closeModal(elements.wellSitesModal);
  });
}
if (elements.btnCloseWellSitesBottom) {
  elements.btnCloseWellSitesBottom.addEventListener('click', () => {
    closeModal(elements.wellSitesModal);
  });
}

// Reload Default Well Sites
if (elements.btnReloadWellSites) {
  elements.btnReloadWellSites.addEventListener('click', async () => {
    try {
      elements.btnReloadWellSites.disabled = true;
      elements.btnReloadWellSites.textContent = 'Reloading...';
      const res = await fetch('/api/well-sites/load-default');
      const data = await res.json();
      if (data.success) {
        appState.wellSiteData = data;
        if (elements.headerWellCountBadge) {
          elements.headerWellCountBadge.textContent = data.totalWells || 0;
        }
        populateWellDatalist();
        renderWellSitesDirectory();
        showToast(data.message, 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Reload failed: ' + err.message, 'error');
    } finally {
      elements.btnReloadWellSites.disabled = false;
      elements.btnReloadWellSites.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Reload File
      `;
    }
  });
}

// Upload custom well site Excel file
if (elements.wellFileInput) {
  elements.wellFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('wellSiteFile', file);

    try {
      showToast(`Uploading well site file ${file.name}...`, 'info');
      const res = await fetch('/api/well-sites/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        appState.wellSiteData = data;
        if (elements.headerWellCountBadge) {
          elements.headerWellCountBadge.textContent = data.totalWells || 0;
        }
        populateWellDatalist();
        renderWellSitesDirectory();
        showToast(data.message, 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      elements.wellFileInput.value = '';
    }
  });
}

// Route Helper Toggle & Actions
if (elements.btnToggleRouteHelper) {
  elements.btnToggleRouteHelper.addEventListener('click', () => {
    elements.routeHelperBox.classList.toggle('open');
    if (elements.routeHelperBox.classList.contains('open')) {
      elements.routeFromSelect.focus();
    }
  });
}

if (elements.btnApplyRoute) {
  elements.btnApplyRoute.addEventListener('click', () => {
    const from = (elements.routeFromSelect.value || '').trim();
    const to = (elements.routeToSelect.value || '').trim();
    const parked = (elements.routeParkedSelect.value || '').trim();

    if (!from && !to && !parked) {
      showToast('Please specify at least From or To location.', 'error');
      return;
    }

    let routeStr = '';
    if (from && to && parked) {
      routeStr = `${from} TO ${to} AND PARKED AT ${parked}`;
    } else if (from && to) {
      routeStr = `${from} TO ${to}`;
    } else if (from && parked) {
      routeStr = `${from} AND PARKED AT ${parked}`;
    } else if (to && parked) {
      routeStr = `${to} AND PARKED AT ${parked}`;
    } else if (from) {
      routeStr = `STANDBY AT ${from}`;
    } else if (to) {
      routeStr = `MOVEMENT TO ${to}`;
    }

    elements.directDetails.value = routeStr;
    elements.routeHelperBox.classList.remove('open');
    showToast(`Route set: ${routeStr}`, 'info');
    elements.directDetails.focus();
  });
}

// Universal Scroll-to-Top Helper for all responsive containers and views
function resetScrollToTop() {
  const doScroll = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    const mainContent = document.querySelector('.app-main-content');
    if (mainContent) mainContent.scrollTop = 0;

    const wrapper = document.querySelector('.main-content-wrapper');
    if (wrapper) wrapper.scrollTop = 0;

    const viewOtFde = document.getElementById('viewOtFde');
    if (viewOtFde) viewOtFde.scrollTop = 0;

    const otHub = document.getElementById('otDashboardHub');
    if (otHub) otHub.scrollTop = 0;

    document.querySelectorAll('.tab-view, .ot-subpage-view').forEach(el => {
      if (el && el.scrollTop !== undefined) el.scrollTop = 0;
    });
  };

  // Immediate synchronous pass
  doScroll();

  // Frame paint pass
  requestAnimationFrame(doScroll);

  // Microtask timeouts for dynamic table reflows
  setTimeout(doScroll, 30);
  setTimeout(doScroll, 100);
}
window.resetScrollToTop = resetScrollToTop;

// ============================================================
// TOP LEVEL MAIN TAB NAVIGATION (Launchpad, Well Sites, Vehicle Log, Settings)
// ============================================================
function switchMainTab(tabName) {
  // Pre-reset scroll to top before any DOM layout changes
  resetScrollToTop();

  appState.activeMainTab = tabName;

  // Nav buttons active states
  if (elements.tabBtnWellSites) elements.tabBtnWellSites.classList.toggle('active', tabName === 'wellSites');
  if (elements.tabBtnVehicleLog) elements.tabBtnVehicleLog.classList.toggle('active', tabName === 'vehicleLog');
  if (elements.tabBtnMaintenance) elements.tabBtnMaintenance.classList.toggle('active', tabName === 'maintenance');
  if (elements.tabBtnOtFde) elements.tabBtnOtFde.classList.toggle('active', tabName === 'otFde');
  if (elements.tabBtnSettings) elements.tabBtnSettings.classList.toggle('active', tabName === 'settings');

  // View sections active states (Closed Launchpad Hub vs Open Section)
  if (elements.viewHomeHub) elements.viewHomeHub.classList.toggle('active', tabName === null);
  if (elements.viewWellSites) elements.viewWellSites.classList.toggle('active', tabName === 'wellSites');
  if (elements.viewVehicleLog) elements.viewVehicleLog.classList.toggle('active', tabName === 'vehicleLog');
  if (elements.viewMaintenance) elements.viewMaintenance.classList.toggle('active', tabName === 'maintenance');
  if (elements.viewOtFde) elements.viewOtFde.classList.toggle('active', tabName === 'otFde');
  if (elements.viewSettings) elements.viewSettings.classList.toggle('active', tabName === 'settings');

  // Update hub badges with live numbers
  updateHubBadges();

  // If opening OT & FDE, ensure the subpages are reset to OT Dashboard Hub cleanly
  if (tabName === 'otFde') {
    if (typeof openOtPage === 'function' && (!appState.activeOtSubPage || appState.activeOtSubPage === 'hub')) {
      openOtPage('hub');
    }
  }

  // Trigger renders if opened
  if (tabName === 'wellSites') {
    renderMainWellSiteDirectory();
  } else if (tabName === 'settings') {
    renderSettingsClusterTable();
  } else if (tabName === 'vehicleLog') {
    renderBatchSummary();
    renderTripTable();
  } else if (tabName === 'maintenance') {
    renderMaintenanceView();
  } else if (tabName === 'otFde') {
    renderOtFdeView();
  }

  // Post-render scroll reset pass
  resetScrollToTop();
}

function updateHubBadges() {
  const wellCount = appState.wellSiteData?.totalWells || 112;
  const clusterCount = appState.wellSiteData?.totalClusters || 34;
  const fleetCount = (appState.vehicles || []).length || 4;
  const crewCount = Object.keys(appState.otFdeData?.roster || {}).length || 12;

  if (elements.hubBadgeWells) elements.hubBadgeWells.textContent = `${wellCount} Wells`;
  if (elements.hubBadgeVehicles) elements.hubBadgeVehicles.textContent = `${fleetCount} Heavy Winches`;
  if (elements.hubBadgeCrew) elements.hubBadgeCrew.textContent = `${crewCount} Winch Crew`;
  if (elements.hubBadgeClusters) elements.hubBadgeClusters.textContent = `${clusterCount} Clusters`;
}

window.switchMainTab = switchMainTab;

// Select a vehicle by Name (e.g. AS-04AC-3120) or ID
function selectVehicleByNameOrId(nameOrId) {
  const v = appState.vehicles.find(veh => veh.id === nameOrId || veh.name === nameOrId);
  if (v) {
    appState.activeVehicleId = v.id;
    if (v.batches && v.batches.length > 0) {
      appState.activeBatchId = v.batches[v.batches.length - 1].id;
    }
    renderAll();
    resetScrollToTop();
    showToast(`Switched to Winch ${v.name}`, 'info');
  }
}

// Sidebar Minimize / Expand Controller
function toggleSidebar(forceState) {
  if (!elements.appSidebar) return;
  const isCurrentlyMinimized = elements.appSidebar.classList.contains('minimized');
  const shouldMinimize = (typeof forceState === 'boolean') ? forceState : !isCurrentlyMinimized;

  // On mobile (< 900px), toggle mobile-open class instead
  if (window.innerWidth <= 900) {
    elements.appSidebar.classList.toggle('mobile-open');
    if (elements.sidebarBackdrop) {
      elements.sidebarBackdrop.classList.toggle('active', elements.appSidebar.classList.contains('mobile-open'));
    }
    return;
  }

  elements.appSidebar.classList.toggle('minimized', shouldMinimize);
  appState.sidebarMinimized = shouldMinimize;
  localStorage.setItem('ongc_sidebar_minimized', shouldMinimize ? 'true' : 'false');

  if (elements.btnSidebarMinimize) {
    elements.btnSidebarMinimize.title = shouldMinimize ? 'Expand Sidebar (Ctrl+B)' : 'Minimize Sidebar (Ctrl+B)';
  }
}

function closeMobileSidebar() {
  if (elements.appSidebar && elements.appSidebar.classList.contains('mobile-open')) {
    elements.appSidebar.classList.remove('mobile-open');
    if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.remove('active');
  }
}

window.toggleSidebar = toggleSidebar;

// Initialize saved sidebar preference
if (localStorage.getItem('ongc_sidebar_minimized') === 'true' && window.innerWidth > 900) {
  toggleSidebar(true);
}

// Sidebar minimize & header toggle listeners
if (elements.btnSidebarMinimize) {
  elements.btnSidebarMinimize.addEventListener('click', () => toggleSidebar());
}
if (elements.btnHeaderSidebarToggle) {
  elements.btnHeaderSidebarToggle.addEventListener('click', () => toggleSidebar());
}
if (elements.sidebarBackdrop) {
  elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
}

// Global hotkey Ctrl+B / Cmd+B to toggle sidebar
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
});

// Main Navigation Tab Event Listeners
if (elements.tabBtnWellSites) {
  elements.tabBtnWellSites.addEventListener('click', () => { closeMobileSidebar(); switchMainTab('wellSites'); });
}
if (elements.tabBtnVehicleLog) {
  elements.tabBtnVehicleLog.addEventListener('click', () => { closeMobileSidebar(); switchMainTab('vehicleLog'); });
}
if (elements.tabBtnMaintenance) {
  elements.tabBtnMaintenance.addEventListener('click', () => { closeMobileSidebar(); switchMainTab('maintenance'); });
}
if (elements.tabBtnOtFde) {
  elements.tabBtnOtFde.addEventListener('click', () => { closeMobileSidebar(); switchMainTab('otFde'); });
}
if (elements.tabBtnSettings) {
  elements.tabBtnSettings.addEventListener('click', () => { closeMobileSidebar(); switchMainTab('settings'); });
}

// Shell Search & User Avatar
if (elements.btnShellSearch) {
  elements.btnShellSearch.addEventListener('click', () => {
    if (appState.activeMainTab === 'vehicleLog') {
      if (elements.searchInput) elements.searchInput.focus();
    } else if (appState.activeMainTab === 'settings') {
      if (elements.settingsClusterSearch) elements.settingsClusterSearch.focus();
    } else {
      if (elements.mainWellSearchInput) elements.mainWellSearchInput.focus();
    }
    showToast('Search ready: enter keywords to filter data in the current view.', 'info');
  });
}

if (elements.shellUserAvatar) {
  elements.shellUserAvatar.addEventListener('click', () => {
    const userName = appState.currentUser?.name || 'UTJJAL CHETIA';
    showToast(`User Profile: ${userName} (UC) • ONGC Reservoir Winch Operations (Assam Asset)`, 'info');
  });
}

// Quick action buttons between tabs (in viewWellSites & viewSettings)
if (elements.btnSwitchToVehicleLog) {
  elements.btnSwitchToVehicleLog.addEventListener('click', () => switchMainTab('vehicleLog'));
}
if (elements.btnGoToSettingsWell) {
  elements.btnGoToSettingsWell.addEventListener('click', () => switchMainTab('settings'));
}
if (elements.btnReturnToWellSites) {
  elements.btnReturnToWellSites.addEventListener('click', () => switchMainTab('wellSites'));
}

// ============================================================
// TAB 1: MAIN WELL SITES DIRECTORY
// ============================================================
function renderMainWellSiteDirectory() {
  const data = appState.wellSiteData || { fields: [], clusters: [], totalWells: 0, totalClusters: 0 };
  const fields = data.fields || [];
  const clusters = data.clusters || [];

  // Update KPI counters
  if (elements.kpiWellSitesCount) elements.kpiWellSitesCount.textContent = data.totalWells || 0;
  if (elements.kpiWellClustersCount) elements.kpiWellClustersCount.textContent = data.totalClusters || clusters.length;
  if (elements.navWellCount) elements.navWellCount.textContent = `${data.totalWells || 112} Wells`;
  if (elements.navSettingsBadge) elements.navSettingsBadge.textContent = `${data.totalClusters || clusters.length || 34} Clusters`;

  // 1. Render Field Filter Pills
  if (elements.mainFieldFilterBar) {
    elements.mainFieldFilterBar.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `field-pill ${appState.mainSelectedWellField === 'ALL' ? 'active' : ''}`;
    allBtn.textContent = `All Fields (${data.totalWells || 0})`;
    allBtn.addEventListener('click', () => {
      appState.mainSelectedWellField = 'ALL';
      renderMainWellSiteDirectory();
    });
    elements.mainFieldFilterBar.appendChild(allBtn);

    fields.forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `field-pill ${appState.mainSelectedWellField === f.fieldName ? 'active' : ''}`;
      const fieldWells = (f.clusters || []).reduce((sum, c) => sum + (c.wells ? c.wells.length : 0), 0);
      btn.textContent = `${f.fieldName} (${fieldWells})`;
      btn.addEventListener('click', () => {
        appState.mainSelectedWellField = f.fieldName;
        renderMainWellSiteDirectory();
      });
      elements.mainFieldFilterBar.appendChild(btn);
    });
  }

  // 2. Filter Clusters
  const q = (appState.mainWellSearchQuery || '').toLowerCase().trim();
  const filteredClusters = clusters.filter(c => {
    if (appState.mainSelectedWellField !== 'ALL' && c.field !== appState.mainSelectedWellField) {
      return false;
    }
    if (q) {
      const matchCluster = (c.clusterName || '').toLowerCase().includes(q);
      const matchField = (c.field || '').toLowerCase().includes(q);
      const matchWell = (c.wells || []).some(w => (w || '').toLowerCase().includes(q));
      return matchCluster || matchField || matchWell;
    }
    return true;
  });

  const displayedWellsCount = filteredClusters.reduce((sum, c) => sum + (c.wells ? c.wells.length : 0), 0);
  if (elements.mainWellCountText) {
    elements.mainWellCountText.textContent = `Showing ${displayedWellsCount} wells across ${filteredClusters.length} clusters`;
  }

  // 3. Render Cluster Cards
  if (!elements.mainWellClusterGrid) return;
  elements.mainWellClusterGrid.innerHTML = '';

  if (filteredClusters.length === 0) {
    elements.mainWellClusterGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No well sites found matching "<strong>${escapeHtml(q)}</strong>"</p>
        <button type="button" class="btn btn-secondary" id="btnClearMainSearch">
          Clear Search
        </button>
      </div>
    `;
    const btnClear = elements.mainWellClusterGrid.querySelector('#btnClearMainSearch');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        appState.mainWellSearchQuery = '';
        if (elements.mainWellSearchInput) elements.mainWellSearchInput.value = '';
        renderMainWellSiteDirectory();
      });
    }
    return;
  }

  filteredClusters.forEach(cluster => {
    const card = document.createElement('div');
    card.className = 'well-cluster-card';
    card.innerHTML = `
      <div class="well-cluster-header">
        <span class="well-cluster-title">${escapeHtml(cluster.clusterName)}</span>
        <span class="well-cluster-field-badge">${escapeHtml(cluster.field)}</span>
      </div>
      <div class="well-badges-list">
        ${(cluster.wells || []).map(w => `
          <button type="button" class="well-pill-interactive" title="Click to insert ${escapeHtml(w)} and switch to Vehicle HSD Log" data-well="${escapeHtml(w)}">
            ${escapeHtml(w)}
          </button>
        `).join('')}
      </div>
    `;

    // Clicking any well pill: inserts into details and switches to Vehicle Log tab
    card.querySelectorAll('.well-pill-interactive').forEach(pill => {
      pill.addEventListener('click', () => {
        const wellName = pill.getAttribute('data-well');
        insertWellIntoMovement(wellName);
        switchMainTab('vehicleLog');
        showToast(`Selected ${wellName} & switched to Vehicle HSD Log`, 'info');
      });
    });

    elements.mainWellClusterGrid.appendChild(card);
  });
}

// Search Well Sites Input on Tab 1
if (elements.mainWellSearchInput) {
  elements.mainWellSearchInput.addEventListener('input', (e) => {
    appState.mainWellSearchQuery = e.target.value;
    renderMainWellSiteDirectory();
  });
}

// ============================================================
// TAB 3: SETTINGS & WELL SITE MANAGEMENT
// ============================================================
function renderSettingsClusterTable() {
  if (!elements.settingsClusterTableBody) return;

  const data = appState.wellSiteData || { clusters: [] };
  const clusters = data.clusters || [];
  const q = (appState.settingsClusterSearchQuery || '').toLowerCase().trim();

  const filtered = clusters.filter(c => {
    if (!q) return true;
    const matchCluster = (c.clusterName || '').toLowerCase().includes(q);
    const matchField = (c.field || '').toLowerCase().includes(q);
    const matchWell = (c.wells || []).some(w => (w || '').toLowerCase().includes(q));
    return matchCluster || matchField || matchWell;
  });

  elements.settingsClusterTableBody.innerHTML = '';
  if (filtered.length === 0) {
    elements.settingsClusterTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No clusters found matching "${escapeHtml(q)}".
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="well-cluster-field-badge" style="font-size: 0.72rem;">${escapeHtml(c.field)}</span></td>
      <td><strong>${escapeHtml(c.clusterName)}</strong></td>
      <td>
        <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
          ${(c.wells || []).map(w => `<span class="badge" style="background: var(--bg-hover); color: var(--text-main); font-size: 0.72rem; padding: 0.2rem 0.45rem;">${escapeHtml(w)}</span>`).join('')}
        </div>
      </td>
      <td class="text-right"><span class="badge badge-info">${(c.wells || []).length}</span></td>
      <td class="text-center">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button type="button" class="btn btn-secondary btn-action-small btn-edit-cluster" data-id="${escapeHtml(c.id)}" title="Edit cluster details">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button type="button" class="btn btn-danger btn-action-small btn-delete-cluster" data-id="${escapeHtml(c.id)}" title="Delete cluster">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </td>
    `;

    // Edit button click
    const btnEdit = tr.querySelector('.btn-edit-cluster');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => openEditClusterModal(c));
    }

    // Delete button click
    const btnDel = tr.querySelector('.btn-delete-cluster');
    if (btnDel) {
      btnDel.addEventListener('click', () => deleteClusterConfirm(c));
    }

    elements.settingsClusterTableBody.appendChild(tr);
  });
}

// Search filter in Settings
if (elements.settingsClusterSearch) {
  elements.settingsClusterSearch.addEventListener('input', (e) => {
    appState.settingsClusterSearchQuery = e.target.value;
    renderSettingsClusterTable();
  });
}

// Add New Cluster Form Handler
if (elements.addClusterForm) {
  elements.addClusterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const field = elements.newClusterField.value.trim().toUpperCase();
    const clusterName = elements.newClusterName.value.trim().toUpperCase();
    const wells = elements.newClusterWells.value.trim();

    if (!field || !clusterName || !wells) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/well-sites/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, clusterName, wells })
      });
      const data = await res.json();
      if (data.success) {
        appState.wellSiteData = data;
        elements.addClusterForm.reset();
        populateWellDatalist();
        renderWellSitesDirectory();
        renderMainWellSiteDirectory();
        renderSettingsClusterTable();
        showToast(data.message || 'Cluster added successfully!', 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to add cluster: ' + err.message, 'error');
    }
  });
}

// Open Edit Cluster Modal
function openEditClusterModal(cluster) {
  if (!elements.editClusterModal) return;
  elements.editClusterId.value = cluster.id || '';
  elements.editClusterField.value = cluster.field || '';
  elements.editClusterName.value = cluster.clusterName || '';
  elements.editClusterWells.value = (cluster.wells || []).join(', ');
  openModal(elements.editClusterModal);
}

// Close Edit Cluster Modal
if (elements.btnCloseEditClusterModal) {
  elements.btnCloseEditClusterModal.addEventListener('click', () => {
    closeModal(elements.editClusterModal);
  });
}
if (elements.btnCancelEditClusterModal) {
  elements.btnCancelEditClusterModal.addEventListener('click', () => {
    closeModal(elements.editClusterModal);
  });
}

// Save Edit Cluster Form Handler
if (elements.editClusterForm) {
  elements.editClusterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = elements.editClusterId.value;
    const field = elements.editClusterField.value.trim().toUpperCase();
    const clusterName = elements.editClusterName.value.trim().toUpperCase();
    const wells = elements.editClusterWells.value.trim();

    if (!id || !field || !clusterName || !wells) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/well-sites/cluster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, clusterName, wells })
      });
      const data = await res.json();
      if (data.success) {
        appState.wellSiteData = data;
        closeModal(elements.editClusterModal);
        populateWellDatalist();
        renderWellSitesDirectory();
        renderMainWellSiteDirectory();
        renderSettingsClusterTable();
        showToast(data.message || 'Cluster updated successfully!', 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update cluster: ' + err.message, 'error');
    }
  });
}

// Delete Cluster
async function deleteClusterConfirm(cluster) {
  if (!confirm(`Are you sure you want to delete "${cluster.clusterName}" with its ${cluster.wells.length} wells?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/well-sites/cluster?id=${encodeURIComponent(cluster.id)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      appState.wellSiteData = data;
      populateWellDatalist();
      renderWellSitesDirectory();
      renderMainWellSiteDirectory();
      renderSettingsClusterTable();
      showToast(data.message || 'Cluster deleted successfully!', 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to delete cluster: ' + err.message, 'error');
  }
}

// Reload Default Well Sites in Settings
if (elements.btnSettingsReloadWellFile) {
  elements.btnSettingsReloadWellFile.addEventListener('click', reloadWellSitesData);
}
if (elements.btnSettingsReloadWell) {
  elements.btnSettingsReloadWell.addEventListener('click', reloadWellSitesData);
}

async function reloadWellSitesData() {
  try {
    showToast('Reloading original well site info.xlsx...', 'info');
    const res = await fetch('/api/well-sites/load-default');
    const data = await res.json();
    if (data.success) {
      appState.wellSiteData = data;
      populateWellDatalist();
      renderWellSitesDirectory();
      renderMainWellSiteDirectory();
      renderSettingsClusterTable();
      showToast(data.message, 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Reload failed: ' + err.message, 'error');
  }
}

// Settings Well File Upload
if (elements.settingsWellFileInput) {
  elements.settingsWellFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('wellSiteFile', file);

    try {
      showToast(`Uploading well site file ${file.name}...`, 'info');
      const res = await fetch('/api/well-sites/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        appState.wellSiteData = data;
        populateWellDatalist();
        renderWellSitesDirectory();
        renderMainWellSiteDirectory();
        renderSettingsClusterTable();
        showToast(data.message, 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      elements.settingsWellFileInput.value = '';
    }
  });
}

// Settings Vehicle File Reload
if (elements.btnSettingsReloadVehicle) {
  elements.btnSettingsReloadVehicle.addEventListener('click', async () => {
    try {
      showToast('Reloading vehicle logbook...', 'info');
      const res = await fetch('/api/load-default');
      const data = await res.json();
      if (data.success) {
        updateState(data);
        showToast(data.message, 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Reload failed: ' + err.message, 'error');
    }
  });
}

// Settings Vehicle File Upload
if (elements.settingsVehicleFileInput) {
  elements.settingsVehicleFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      showToast(`Uploading ${file.name}...`, 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        updateState(data);
        showToast(data.message, 'success');
      } else {
        showToast('Upload error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      elements.settingsVehicleFileInput.value = '';
    }
  });
}

// ============================================================
// TAB 3: VEHICLE DOCUMENTS & MAINTENANCE LOGIC
// ============================================================

// Helper to format ISO date string or date object into DD-MM-YYYY
function formatMaintenanceDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Not Specified') return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper to get category CSS class and icon
function getCategoryTagInfo(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('fluid') || c.includes('oil') || c.includes('coolant') || c.includes('hydraulic')) {
    return { className: 'cat-fluids', icon: '💧', label: 'Fluids & Lube' };
  }
  if (c.includes('brake') || c.includes('servo')) {
    return { className: 'cat-brake', icon: '🛑', label: 'Brake System' };
  }
  if (c.includes('elect') || c.includes('starter') || c.includes('motor') || c.includes('wiring') || c.includes('battery')) {
    return { className: 'cat-electrical', icon: '⚡', label: 'Electrical' };
  }
  if (c.includes('engine') || c.includes('diagnos')) {
    return { className: 'cat-engine', icon: '🔍', label: 'Engine Diag' };
  }
  if (c.includes('wheel') || c.includes('tire') || c.includes('hub')) {
    return { className: 'cat-wheel', icon: '🔘', label: 'Wheel & Hub' };
  }
  if (c.includes('mech') || c.includes('winch')) {
    return { className: 'cat-mechanical', icon: '⚙️', label: 'Mechanical' };
  }
  return { className: 'cat-general', icon: '🔧', label: cat || 'General' };
}

// Fetch maintenance data from backend
async function fetchMaintenanceData() {
  try {
    const res = await fetch('/api/maintenance');
    const data = await res.json();
    if (data.success) {
      appState.maintenanceData = data;
      renderMaintenanceView();
    }
  } catch (err) {
    console.error('Failed to fetch maintenance data:', err);
  }
}

// Render complete Tab 3 Maintenance View
function renderMaintenanceView() {
  const data = appState.maintenanceData || { vehicles: [], maintenanceRecords: [] };
  const vehicles = data.vehicles || [];
  const records = data.maintenanceRecords || [];

  // 1. Calculate KPI counts
  let validCount = 0;
  let expiringCount = 0;
  vehicles.forEach(v => {
    const statuses = [v.taxStatus, v.pollutionStatus, v.insuranceStatus, v.permitStatus];
    statuses.forEach(s => {
      if (s && s.status === 'valid') validCount++;
      if (s && (s.status === 'expiring_soon' || s.status === 'expired')) expiringCount++;
    });
  });

  if (elements.kpiMaintFleetCount) elements.kpiMaintFleetCount.textContent = vehicles.length || 4;
  if (elements.kpiMaintValidDocs) elements.kpiMaintValidDocs.textContent = validCount;
  if (elements.kpiMaintExpiringDocs) elements.kpiMaintExpiringDocs.textContent = expiringCount;
  if (elements.kpiMaintTotalRecords) elements.kpiMaintTotalRecords.textContent = records.length;
  if (elements.navMaintenanceCount) elements.navMaintenanceCount.textContent = `${vehicles.length || 4} Winches`;

  // 2. Render Document Validity Matrix
  renderDocumentMatrix();

  // 3. Render Vehicle Filter Pills
  renderMaintenanceFilterBar();

  // 4. Render Maintenance Table
  renderMaintenanceTable();
}

// Render Document Validity Matrix Table
function renderDocumentMatrix() {
  if (!elements.maintenanceDocMatrixBody) return;
  elements.maintenanceDocMatrixBody.innerHTML = '';

  const vehicles = appState.maintenanceData.vehicles || [];
  if (vehicles.length === 0) {
    elements.maintenanceDocMatrixBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No vehicle statutory records found. Click "Reload Maintenance File" to load default data.
        </td>
      </tr>
    `;
    return;
  }

  vehicles.forEach(v => {
    const tr = document.createElement('tr');

    function createDocCell(isoDate, formatted, statusObj) {
      if (!isoDate || !statusObj || statusObj.status === 'na') {
        return `
          <span class="compliance-pill na">
            <span class="compliance-date">N/A</span>
            <span class="compliance-status-label">Not Specified</span>
          </span>
        `;
      }
      const pillClass = statusObj.status === 'valid' ? 'valid' : (statusObj.status === 'expiring_soon' ? 'expiring' : 'expired');
      const label = statusObj.label || (statusObj.status === 'valid' ? 'Valid' : (statusObj.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'));

      return `
        <span class="compliance-pill ${pillClass}">
          <span class="compliance-date">${escapeHtml(formatted || isoDate)}</span>
          <span class="compliance-status-label">${escapeHtml(label)}</span>
        </span>
      `;
    }

    // Determine overall compliance
    const statuses = [v.taxStatus, v.pollutionStatus, v.insuranceStatus, v.permitStatus];
    const hasExpired = statuses.some(s => s && s.status === 'expired');
    const hasExpiring = statuses.some(s => s && s.status === 'expiring_soon');
    let overallBadge = `<span class="badge badge-success" style="font-size: 0.76rem; padding: 0.25rem 0.6rem;">Compliant</span>`;
    if (hasExpired) {
      overallBadge = `<span class="badge badge-danger" style="font-size: 0.76rem; padding: 0.25rem 0.6rem;">Attention Needed</span>`;
    } else if (hasExpiring) {
      overallBadge = `<span class="badge badge-warning" style="font-size: 0.76rem; padding: 0.25rem 0.6rem;">Expiring Soon</span>`;
    }

    tr.innerHTML = `
      <td>
        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(v.vehicleId)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(v.vehicleName || 'Reservoir Winch')}</div>
      </td>
      <td>${createDocCell(v.tax, v.taxFormatted, v.taxStatus)}</td>
      <td>${createDocCell(v.pollution, v.pollutionFormatted, v.pollutionStatus)}</td>
      <td>${createDocCell(v.insurance, v.insuranceFormatted, v.insuranceStatus)}</td>
      <td>${createDocCell(v.permit, v.permitFormatted, v.permitStatus)}</td>
      <td class="text-center">${overallBadge}</td>
      <td class="text-center">
        <button type="button" class="btn btn-secondary btn-action-small btn-edit-docs" data-vid="${escapeHtml(v.vehicleId)}" title="Edit / Renew statutory documents validity dates">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Renew / Edit
        </button>
      </td>
    `;

    const btnEdit = tr.querySelector('.btn-edit-docs');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => openEditDocumentsModal(v));
    }

    elements.maintenanceDocMatrixBody.appendChild(tr);
  });
}

// Render Vehicle Filter Pills for Maintenance History
function renderMaintenanceFilterBar() {
  if (!elements.maintenanceVehicleFilterBar) return;
  elements.maintenanceVehicleFilterBar.innerHTML = '';

  const records = appState.maintenanceData.maintenanceRecords || [];
  const vehicles = appState.maintenanceData.vehicles || [];

  // All Winches Pill
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `field-pill ${appState.selectedMaintenanceVehicle === 'ALL' ? 'active' : ''}`;
  allBtn.textContent = `All Winches (${records.length})`;
  allBtn.addEventListener('click', () => {
    appState.selectedMaintenanceVehicle = 'ALL';
    renderMaintenanceFilterBar();
    renderMaintenanceTable();
  });
  elements.maintenanceVehicleFilterBar.appendChild(allBtn);

  // Each Vehicle Pill
  vehicles.forEach(v => {
    const vCount = records.filter(r => r.vehicleId === v.vehicleId).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `field-pill ${appState.selectedMaintenanceVehicle === v.vehicleId ? 'active' : ''}`;
    btn.textContent = `${v.vehicleId} (${vCount})`;
    btn.addEventListener('click', () => {
      appState.selectedMaintenanceVehicle = v.vehicleId;
      renderMaintenanceFilterBar();
      renderMaintenanceTable();
    });
    elements.maintenanceVehicleFilterBar.appendChild(btn);
  });
}

// Render Maintenance History Table
function renderMaintenanceTable() {
  if (!elements.maintenanceTableBody) return;
  elements.maintenanceTableBody.innerHTML = '';

  const records = appState.maintenanceData.maintenanceRecords || [];
  const q = (appState.maintenanceSearchQuery || '').toLowerCase().trim();

  const filtered = records.filter(r => {
    if (appState.selectedMaintenanceVehicle !== 'ALL' && r.vehicleId !== appState.selectedMaintenanceVehicle) {
      return false;
    }
    if (q) {
      const matchVeh = (r.vehicleId || '').toLowerCase().includes(q);
      const matchCat = (r.category || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchParts = (r.partsReplaced || '').toLowerCase().includes(q);
      const matchShop = (r.serviceCenter || '').toLowerCase().includes(q);
      return matchVeh || matchCat || matchDesc || matchParts || matchShop;
    }
    return true;
  });

  if (elements.maintRecordsCountText) {
    elements.maintRecordsCountText.textContent = `Showing ${filtered.length} of ${records.length} maintenance records`;
  }

  if (filtered.length === 0) {
    elements.maintenanceTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No maintenance orders found matching criteria. Click "+ Log Work Order" to record new service.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    const catInfo = getCategoryTagInfo(r.category);
    const dateFormatted = formatMaintenanceDate(r.date);

    tr.innerHTML = `
      <td><strong>${escapeHtml(dateFormatted)}</strong></td>
      <td>
        <span class="badge badge-info" style="font-size: 0.78rem; font-weight: 700;">
          ${escapeHtml(r.vehicleId || 'AS-04AC-7845')}
        </span>
      </td>
      <td>
        <span class="category-pill ${catInfo.className}">
          <span>${catInfo.icon}</span>
          <span>${escapeHtml(r.category || catInfo.label)}</span>
        </span>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.description || '')}</div>
      </td>
      <td>
        ${r.partsReplaced ? `<span class="maint-parts-badge" title="${escapeHtml(r.partsReplaced)}">${escapeHtml(r.partsReplaced)}</span>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
      </td>
      <td>
        <span style="font-size: 0.8rem; color: var(--text-main);">${escapeHtml(r.serviceCenter || 'Internal / Central')}</span>
      </td>
      <td class="text-right">
        <strong>${r.cost ? '₹ ' + Number(r.cost).toLocaleString('en-IN') : '—'}</strong>
      </td>
      <td class="text-center">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button type="button" class="btn btn-secondary btn-action-small btn-edit-maint" title="Edit work order">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button type="button" class="btn btn-danger btn-action-small btn-del-maint" title="Delete work order">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    const btnEdit = tr.querySelector('.btn-edit-maint');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => openEditMaintenanceModal(r));
    }

    const btnDel = tr.querySelector('.btn-del-maint');
    if (btnDel) {
      btnDel.addEventListener('click', () => deleteMaintenanceRecordConfirm(r));
    }

    elements.maintenanceTableBody.appendChild(tr);
  });
}

// Search input handler
if (elements.maintenanceSearchInput) {
  elements.maintenanceSearchInput.addEventListener('input', (e) => {
    appState.maintenanceSearchQuery = e.target.value;
    renderMaintenanceTable();
  });
}

// Open Log Maintenance Modal
if (elements.btnOpenLogMaintenanceModal) {
  elements.btnOpenLogMaintenanceModal.addEventListener('click', () => {
    if (!elements.logMaintenanceModal) return;
    elements.logMaintenanceForm.reset();
    if (elements.maintDate) {
      elements.maintDate.value = new Date().toISOString().split('T')[0];
    }
    if (elements.maintVehicleSelect && appState.selectedMaintenanceVehicle !== 'ALL') {
      elements.maintVehicleSelect.value = appState.selectedMaintenanceVehicle;
    }
    openModal(elements.logMaintenanceModal);
  });
}

if (elements.btnCloseLogMaintenanceModal) {
  elements.btnCloseLogMaintenanceModal.addEventListener('click', () => closeModal(elements.logMaintenanceModal));
}
if (elements.btnCancelLogMaintenanceModal) {
  elements.btnCancelLogMaintenanceModal.addEventListener('click', () => closeModal(elements.logMaintenanceModal));
}

// Submit Log Maintenance Form
if (elements.logMaintenanceForm) {
  elements.logMaintenanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vehicleId = elements.maintVehicleSelect.value;
    const date = elements.maintDate.value;
    const category = elements.maintCategory.value;
    const cost = elements.maintCost.value ? parseFloat(elements.maintCost.value) : 0;
    const description = elements.maintDetails.value.trim();
    const partsReplaced = elements.maintParts.value.trim();
    const serviceCenter = elements.maintWorkshop.value.trim();

    if (!vehicleId || !date || !description) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/maintenance/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, date, category, cost, description, partsReplaced, serviceCenter })
      });
      const data = await res.json();
      if (data.success) {
        appState.maintenanceData = data;
        closeModal(elements.logMaintenanceModal);
        renderMaintenanceView();
        showToast(data.message || 'Maintenance record logged successfully!', 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to save maintenance record: ' + err.message, 'error');
    }
  });
}

// Open Edit Maintenance Modal
function openEditMaintenanceModal(record) {
  if (!elements.editMaintenanceModal) return;
  elements.editMaintId.value = record.id || '';
  elements.editMaintVehicleSelect.value = record.vehicleId || 'AS-04AC-7845';
  elements.editMaintDate.value = record.date ? record.date.substring(0, 10) : '';
  elements.editMaintCategory.value = record.category || 'Fluids & Lubrication';
  elements.editMaintCost.value = record.cost || '';
  elements.editMaintDetails.value = record.description || '';
  elements.editMaintParts.value = record.partsReplaced || '';
  elements.editMaintWorkshop.value = record.serviceCenter || '';
  openModal(elements.editMaintenanceModal);
}

if (elements.btnCloseEditMaintenanceModal) {
  elements.btnCloseEditMaintenanceModal.addEventListener('click', () => closeModal(elements.editMaintenanceModal));
}
if (elements.btnCancelEditMaintenanceModal) {
  elements.btnCancelEditMaintenanceModal.addEventListener('click', () => closeModal(elements.editMaintenanceModal));
}

// Submit Edit Maintenance Form
if (elements.editMaintenanceForm) {
  elements.editMaintenanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = elements.editMaintId.value;
    const vehicleId = elements.editMaintVehicleSelect.value;
    const date = elements.editMaintDate.value;
    const category = elements.editMaintCategory.value;
    const cost = elements.editMaintCost.value ? parseFloat(elements.editMaintCost.value) : 0;
    const description = elements.editMaintDetails.value.trim();
    const partsReplaced = elements.editMaintParts.value.trim();
    const serviceCenter = elements.editMaintWorkshop.value.trim();

    if (!id || !vehicleId || !date || !description) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/maintenance/record/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, date, category, cost, description, partsReplaced, serviceCenter })
      });
      const data = await res.json();
      if (data.success) {
        appState.maintenanceData = data;
        closeModal(elements.editMaintenanceModal);
        renderMaintenanceView();
        showToast(data.message || 'Maintenance record updated successfully!', 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update maintenance record: ' + err.message, 'error');
    }
  });
}

// Delete Maintenance Record
async function deleteMaintenanceRecordConfirm(record) {
  if (!confirm(`Are you sure you want to delete maintenance record for ${record.vehicleId} on ${record.date}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/maintenance/record/${encodeURIComponent(record.id)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      appState.maintenanceData = data;
      renderMaintenanceView();
      showToast(data.message || 'Record deleted successfully!', 'success');
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to delete record: ' + err.message, 'error');
  }
}

// Open Edit Documents Modal
function openEditDocumentsModal(vehicle) {
  if (!elements.editDocumentsModal) return;
  elements.editDocVehicleId.value = vehicle.vehicleId;
  if (elements.editDocVehicleBadge) {
    elements.editDocVehicleBadge.textContent = `Winch Unit: ${vehicle.vehicleId} (${vehicle.vehicleName || 'Reservoir Winch'})`;
  }

  function getRawDate(d) {
    if (!d || d === 'N/A' || d === 'Not Specified') return '';
    if (typeof d === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
    if (typeof d === 'object' && d.date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return d.date;
      const parsed = new Date(d.date);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
    return '';
  }

  elements.editDocTax.value = getRawDate(vehicle.tax);
  elements.editDocPollution.value = getRawDate(vehicle.pollution);
  elements.editDocInsurance.value = getRawDate(vehicle.insurance);
  elements.editDocPermit.value = getRawDate(vehicle.permit);

  openModal(elements.editDocumentsModal);
}

if (elements.btnCloseEditDocumentsModal) {
  elements.btnCloseEditDocumentsModal.addEventListener('click', () => closeModal(elements.editDocumentsModal));
}
if (elements.btnCancelEditDocumentsModal) {
  elements.btnCancelEditDocumentsModal.addEventListener('click', () => closeModal(elements.editDocumentsModal));
}

// Submit Edit Documents Form
if (elements.editDocumentsForm) {
  elements.editDocumentsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vehicleId = elements.editDocVehicleId.value;
    const tax = elements.editDocTax.value;
    const pollution = elements.editDocPollution.value;
    const insurance = elements.editDocInsurance.value;
    const permit = elements.editDocPermit.value;

    try {
      const res = await fetch(`/api/maintenance/documents/${encodeURIComponent(vehicleId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tax, pollution, insurance, permit })
      });
      const data = await res.json();
      if (data.success) {
        appState.maintenanceData = data;
        closeModal(elements.editDocumentsModal);
        renderMaintenanceView();
        showToast(data.message || 'Statutory document validity dates updated!', 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update documents: ' + err.message, 'error');
    }
  });
}

// Reload Maintenance File from disk
if (elements.btnReloadMaintenance) {
  elements.btnReloadMaintenance.addEventListener('click', async () => {
    try {
      showToast('Reloading original maintenance & document workbook...', 'info');
      const res = await fetch('/api/maintenance/load-default');
      const data = await res.json();
      if (data.success) {
        appState.maintenanceData = data;
        renderMaintenanceView();
        showToast(data.message, 'success');
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to reload maintenance: ' + err.message, 'error');
    }
  });
}

// Upload Maintenance Excel File
if (elements.maintenanceFileInput) {
  elements.maintenanceFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('maintenanceFile', file);

    try {
      showToast(`Uploading maintenance file ${file.name}...`, 'info');
      const res = await fetch('/api/maintenance/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        appState.maintenanceData = data;
        renderMaintenanceView();
        showToast(data.message, 'success');
      } else {
        showToast('Upload error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      elements.maintenanceFileInput.value = '';
    }
  });
}

// ============================================================
// TAB 4: OVERTIME (OT) & FIELD DUTY EXPENDITURE (FDE) MODULE
// ============================================================

async function fetchOtFdeData() {
  try {
    const res = await fetch('/api/ot-fde/data');
    const data = await res.json();
    if (data.success) {
      appState.otFdeData = data;
      populateOtEmployeeDropdowns();
      populateOtWellSitesList();
      renderOtCrewSelector();
      renderEmployeeRoster();
      updateLiveJobPreview();
      updateOtBadges();
      if (appState.activeMainTab === 'otFde') {
        renderOtFdeView();
      }
    }
  } catch (err) {
    console.error('Failed to fetch OT/FDE data:', err);
  }
}

function updateOtBadges() {
  const jobsCount = (appState.otFdeData?.jobs || []).length;
  const rosterCount = Object.keys(appState.otFdeData?.roster || {}).length;
  if (elements.badgeAllJobsCount) elements.badgeAllJobsCount.textContent = jobsCount;
  if (elements.navOtFdeBadge) elements.navOtFdeBadge.textContent = `${rosterCount} Crew`;

  const accCrewBadge = document.getElementById('accCrewBadge');
  if (accCrewBadge) {
    const count = appState.selectedCrewCodes.size;
    accCrewBadge.textContent = `${count} Crew Selected`;
    if (count >= 4 && count <= 10) {
      accCrewBadge.style.background = '#dcfce7';
      accCrewBadge.style.color = '#15803d';
    } else {
      accCrewBadge.style.background = '#fee2e2';
      accCrewBadge.style.color = '#b91c1c';
    }
  }

  const accBadgeAllJobs = document.getElementById('accBadgeAllJobs');
  if (accBadgeAllJobs) accBadgeAllJobs.textContent = `${jobsCount} Recorded Jobs`;
}

function populateOtEmployeeDropdowns() {
  if (!appState.otFdeData || !appState.otFdeData.roster) return;
  const roster = appState.otFdeData.roster;
  const codes = Object.keys(roster);

  const buildOptions = (selectedCode, includeAll = false) => {
    let html = '';
    if (includeAll) {
      html += `<option value="ALL" ${selectedCode === 'ALL' ? 'selected' : ''}>👥 ALL CREW MEMBERS (Monthly Fleet Summary)</option>`;
    }
    html += codes.map(code => {
      const emp = roster[code];
      const isSel = code === selectedCode ? 'selected' : '';
      return `<option value="${code}" ${isSel}>${escapeHtml(emp.name)} (CPF: ${escapeHtml(emp.cpf || '—')}) — ₹${emp.otRate}/hr</option>`;
    }).join('');
    return html;
  };

  if (elements.otStatementEmployee) {
    elements.otStatementEmployee.innerHTML = buildOptions(appState.activeOtStatementEmployee, true);
  }
  if (elements.fdeStatementEmployee) {
    elements.fdeStatementEmployee.innerHTML = buildOptions(appState.activeFdeStatementEmployee, false);
  }
  if (elements.otYearCrewFilter) {
    let yearCrewHtml = `<option value="ALL" ${appState.activeOtYearCrew === 'ALL' ? 'selected' : ''}>👥 ALL CREW (Fleet Overview)</option>`;
    yearCrewHtml += codes.map(code => {
      const emp = roster[code];
      const isSel = code === appState.activeOtYearCrew ? 'selected' : '';
      return `<option value="${code}" ${isSel}>${escapeHtml(emp.name)} (${code}) — ₹${emp.otRate}/hr</option>`;
    }).join('');
    elements.otYearCrewFilter.innerHTML = yearCrewHtml;
  }
}

function populateOtWellSitesList() {
  if (!elements.otWellList) return;
  const set = new Set();
  if (appState.wellSiteData && appState.wellSiteData.wells) {
    appState.wellSiteData.wells.forEach(w => {
      if (w.name) set.add(w.name);
    });
  }
  if (appState.otFdeData && appState.otFdeData.jobs) {
    appState.otFdeData.jobs.forEach(j => {
      if (j.location) set.add(j.location);
    });
  }
  elements.otWellList.innerHTML = Array.from(set).sort().map(w => `<option value="${escapeHtml(w)}">`).join('');
}

// ============================================================
// CLOSED ACCORDION SYSTEM CONTROLLER
// All sections are closed by default; clicking one opens it completely!
// ============================================================
// ============================================================
// MODULAR OT & FDE ROUTER (5 DASHBOARD BOXES & DEDICATED SUBPAGES)
// Clicking any of the 5 boxes redirects cleanly to that desire page
// ============================================================
function updateOtDashboardCounts() {
  const jobs = appState.otFdeData?.jobs || [];
  const roster = appState.otFdeData?.roster || {};
  const totalJobs = jobs.length;
  const allCrew = Object.values(roster);
  const activeCrew = allCrew.filter(e => e.status !== 'retired');

  const hubJobBadge = document.getElementById('hubBadgeAllJobsCount');
  if (hubJobBadge) hubJobBadge.textContent = `${totalJobs}`;

  const hubCrewBadge = document.getElementById('hubBadgeCrewCount');
  if (hubCrewBadge) hubCrewBadge.textContent = `${activeCrew.length} Crew`;

  document.querySelectorAll('.badgeAllJobsCountText').forEach(el => {
    el.textContent = `${totalJobs}`;
  });
}

function openOtPage(pageId) {
  // Pre-reset viewport
  resetScrollToTop();

  const hub = document.getElementById('otDashboardHub');
  const pages = document.querySelectorAll('.ot-subpage-view');

  if (!pageId || pageId === 'hub') {
    appState.activeOtSubPage = 'hub';
    if (hub) hub.style.display = 'flex';
    pages.forEach(p => p.classList.remove('active'));
    updateOtDashboardCounts();
    resetScrollToTop();
    return;
  }

  appState.activeOtSubPage = pageId;
  if (hub) hub.style.display = 'none';
  pages.forEach(p => p.classList.remove('active'));

  const targetPage = document.getElementById(`otPage-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Update active status on subnav pill buttons across all subpage headers
  document.querySelectorAll('.ot-subnav-pill').forEach(pill => {
    if (pill.getAttribute('data-sub') === pageId) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Render content corresponding to the active page
  if (pageId === 'logJob') {
    renderOtCrewSelector();
    updateLiveJobPreview();
  } else if (pageId === 'otStatement') {
    renderOtStatement();
  } else if (pageId === 'fdeStatement') {
    renderFdeStatement();
  } else if (pageId === 'allJobs') {
    renderAllJobsTable();
  } else if (pageId === 'roster') {
    renderEmployeeRoster();
  }

  // Clean, instantaneous viewport reset to very top of page
  resetScrollToTop();
}

window.openOtPage = openOtPage;
window.toggleOtAccordion = (sectionId) => openOtPage(sectionId);
window.switchOtSubTab = (sectionId) => openOtPage(sectionId);
window.closeAllOtAccordions = () => openOtPage('hub');

const btnQuickLog = document.getElementById('btnQuickLogJob');
if (btnQuickLog) {
  btnQuickLog.addEventListener('click', () => openOtPage('logJob'));
}

function renderOtFdeView() {
  updateOtBadges();
  updateOtDashboardCounts();
  if (appState.activeOtSubPage && appState.activeOtSubPage !== 'hub') {
    openOtPage(appState.activeOtSubPage);
  } else {
    openOtPage('hub');
  }
}

// Crew Selector
function renderOtCrewSelector() {
  if (!elements.otCrewChipsContainer || !appState.otFdeData || !appState.otFdeData.roster) return;
  const roster = appState.otFdeData.roster;
  const count = appState.selectedCrewCodes.size;

  if (elements.crewSelectCountBadge) {
    elements.crewSelectCountBadge.textContent = `${count} of 10 Selected (${count >= 4 && count <= 10 ? 'Valid' : 'Min 4, Max 10'})`;
    if (count >= 4 && count <= 10) {
      elements.crewSelectCountBadge.className = 'crew-counter-badge valid';
      elements.crewSelectCountBadge.style.background = '#dcfce7';
      elements.crewSelectCountBadge.style.color = '#15803d';
      elements.crewSelectCountBadge.style.border = '1px solid #86efac';
    } else {
      elements.crewSelectCountBadge.className = 'crew-counter-badge warn';
      elements.crewSelectCountBadge.style.background = '#fee2e2';
      elements.crewSelectCountBadge.style.color = '#b91c1c';
      elements.crewSelectCountBadge.style.border = '1px solid #fca5a5';
    }
  }

  const chipsHtml = Object.values(roster).map(emp => {
    const isSelected = appState.selectedCrewCodes.has(emp.code);
    return `
      <div class="ot-crew-chip ${isSelected ? 'selected' : ''}" data-emp-code="${escapeHtml(emp.code)}" onclick="toggleCrewSelection('${escapeHtml(emp.code)}')">
        <div class="ot-crew-chip-left">
          <span class="ot-crew-code-tag">${escapeHtml(emp.code)}</span>
          <div class="ot-crew-info">
            <span class="ot-crew-name-text" title="${escapeHtml(emp.name)}">${escapeHtml(emp.name)}</span>
            <span class="ot-crew-desig-text">${escapeHtml(emp.designation || 'OPERATIONS')}</span>
          </div>
        </div>
        <div class="ot-crew-chip-check">
          ${isSelected ? `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  elements.otCrewChipsContainer.innerHTML = chipsHtml;
}

window.toggleCrewSelection = function(code) {
  if (appState.selectedCrewCodes.has(code)) {
    appState.selectedCrewCodes.delete(code);
  } else {
    if (appState.selectedCrewCodes.size >= 10) {
      showToast('A standard Winch Field Job crew allows a maximum of 10 members.', 'warning');
      return;
    }
    appState.selectedCrewCodes.add(code);
  }
  renderOtCrewSelector();
  updateLiveJobPreview();
};

// Crew Preset buttons
if (elements.btnPresetCrewA) {
  elements.btnPresetCrewA.addEventListener('click', () => {
    appState.selectedCrewCodes = new Set(['UC', 'RD', 'YA', 'AB']);
    renderOtCrewSelector();
    updateLiveJobPreview();
    showToast('Applied Preset A (UC, RD, YA, AB)', 'info');
  });
}
if (elements.btnPresetCrewB) {
  elements.btnPresetCrewB.addEventListener('click', () => {
    appState.selectedCrewCodes = new Set(['DJB', 'SD', 'HR', 'RRK']);
    renderOtCrewSelector();
    updateLiveJobPreview();
    showToast('Applied Preset B (DJB, SD, HR, RRK)', 'info');
  });
}
if (elements.btnPresetCrewC) {
  elements.btnPresetCrewC.addEventListener('click', () => {
    appState.selectedCrewCodes = new Set(['PPD', 'DB', 'SR', 'MP']);
    renderOtCrewSelector();
    updateLiveJobPreview();
    showToast('Applied Preset C (PPD, DB, SR, MP)', 'info');
  });
}
if (elements.btnSelectAllCrew) {
  elements.btnSelectAllCrew.addEventListener('click', () => {
    if (!appState.otFdeData || !appState.otFdeData.roster) return;
    const first10Codes = Object.keys(appState.otFdeData.roster).slice(0, 10);
    appState.selectedCrewCodes = new Set(first10Codes);
    renderOtCrewSelector();
    updateLiveJobPreview();
    showToast(`Selected ${first10Codes.length} Crew Members (Max 10)`, 'info');
  });
}
if (elements.btnClearCrewSelection) {
  elements.btnClearCrewSelection.addEventListener('click', () => {
    appState.selectedCrewCodes.clear();
    renderOtCrewSelector();
    updateLiveJobPreview();
    showToast('Cleared crew selection', 'info');
  });
}

// Live preview
async function updateLiveJobPreview() {
  const depTime = elements.otJobDepTime ? elements.otJobDepTime.value : '08:30';
  const arrTime = elements.otJobArrTime ? elements.otJobArrTime.value : '16:30';
  const isHoliday = elements.otJobIsHoliday ? elements.otJobIsHoliday.checked : false;
  const crewCodes = Array.from(appState.selectedCrewCodes);

  if (elements.prevCrewCountText) {
    elements.prevCrewCountText.textContent = `${crewCodes.length} Crew Member${crewCodes.length === 1 ? '' : 's'} Selected`;
  }

  try {
    const res = await fetch('/api/ot-fde/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depTime, arrTime, isHoliday, crewCodes })
    });
    const data = await res.json();
    if (!data.success) return;

    if (elements.prevDutyHours) elements.prevDutyHours.textContent = `${data.dutyHours.toFixed(1)} hrs`;
    if (elements.prevFdShifts) elements.prevFdShifts.textContent = `${data.fdShifts.toFixed(3)} shifts`;
    if (elements.prevFdPerPerson) elements.prevFdPerPerson.textContent = `₹${data.fdAmountPerPerson.toFixed(2)}`;
    if (elements.prevOtHours) elements.prevOtHours.textContent = `${data.otHours.toFixed(1)} hrs`;
    if (elements.prevOtStatus) {
      elements.prevOtStatus.textContent = data.isWithinDutyHours 
        ? '0.0 hrs (Duty 08:30-16:30)' 
        : `${data.otHours.toFixed(1)} hrs OT`;
    }

    if (elements.prevStatusBanner) {
      if (data.isWithinDutyHours) {
        elements.prevStatusBanner.style.background = 'rgba(46, 125, 50, 0.12)';
        elements.prevStatusBanner.style.borderColor = 'rgba(46, 125, 50, 0.4)';
        elements.prevStatusBanner.style.color = '#2e7d32';
        if (elements.prevStatusIcon) elements.prevStatusIcon.textContent = 'check_circle';
        if (elements.prevStatusText) {
          elements.prevStatusText.innerHTML = `<strong>Rule Applied:</strong> Job within normal duty hours (08:30–16:30). <strong>Field Duty (FD = ₹${data.fdAmountPerPerson.toFixed(0)}) applies; OT is 0.0 hrs.</strong>`;
        }
      } else {
        elements.prevStatusBanner.style.background = 'rgba(230, 81, 0, 0.12)';
        elements.prevStatusBanner.style.borderColor = 'rgba(230, 81, 0, 0.4)';
        elements.prevStatusBanner.style.color = '#e65100';
        if (elements.prevStatusIcon) elements.prevStatusIcon.textContent = 'schedule';
        if (elements.prevStatusText) {
          elements.prevStatusText.innerHTML = `<strong>Beyond Duty Hours:</strong> Total Duty ${data.dutyHours.toFixed(1)} hrs ➔ <strong>FD (${data.fdShifts.toFixed(2)} shifts = ₹${data.fdAmountPerPerson.toFixed(0)}) + OT (${data.otHours.toFixed(1)} hrs) apply.</strong>`;
        }
      }
    }

    // Render preview table rows
    if (elements.prevCrewTableBody) {
      if (data.crewBreakdown.length === 0) {
        elements.prevCrewTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No crew members selected. Please select 4 to 10 crew members above.</td></tr>`;
      } else {
        elements.prevCrewTableBody.innerHTML = data.crewBreakdown.map((c, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div style="font-weight: 600;">${escapeHtml(c.name)}</div>
              <span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:10px; font-weight:700;">${escapeHtml(c.code)}</span>
              <span style="font-size:11px; color:var(--sap-text-muted);">CPF ${escapeHtml(c.cpf || '—')}</span>
            </td>
            <td>${escapeHtml(c.designation || '—')}</td>
            <td>₹${Number(c.basicPay || 0).toLocaleString('en-IN')}</td>
            <td style="font-weight: 700; color: #1e40af;">₹${c.otRate}/hr</td>
            <td style="font-weight: 700; color: ${c.otAmount > 0 ? '#b91c1c' : 'var(--sap-text-muted)'};">
              ₹${c.otAmount.toFixed(2)}
              ${c.otHours === 0 ? '<span style="font-size:10px; display:block; color:#059669;">(0 OT hrs)</span>' : ''}
            </td>
            <td style="font-weight: 700; color: #047857;">₹${c.fdAmount.toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--sap-primary); font-size:13px;">₹${(c.otAmount + c.fdAmount).toFixed(2)}</td>
          </tr>
        `).join('');
      }
    }

    if (elements.prevTotalFdPayout) elements.prevTotalFdPayout.textContent = `₹${data.totalFdAcrossCrew.toFixed(2)}`;
    if (elements.prevTotalOtPayout) elements.prevTotalOtPayout.textContent = `₹${data.totalOtAcrossCrew.toFixed(2)}`;

  } catch (err) {
    console.error('Preview failed:', err);
  }
}

// Attach change listeners to job time inputs
if (elements.otJobDepTime) elements.otJobDepTime.addEventListener('change', updateLiveJobPreview);
if (elements.otJobArrTime) elements.otJobArrTime.addEventListener('change', updateLiveJobPreview);
if (elements.otJobIsHoliday) elements.otJobIsHoliday.addEventListener('change', updateLiveJobPreview);

// Live Winch Movement Distance Calculator
function updateWinchDistance() {
  const isStandby = elements.otWinchIsStandby ? elements.otWinchIsStandby.checked : false;
  if (isStandby) {
    if (elements.otWinchStartKm) elements.otWinchStartKm.disabled = true;
    if (elements.otWinchStopKm) elements.otWinchStopKm.disabled = true;
    if (elements.otWinchDistanceBadge) elements.otWinchDistanceBadge.textContent = 'STANDBY (0.0 KM)';
    if (elements.otWinchDistance) elements.otWinchDistance.value = '0';
    return;
  }

  if (elements.otWinchStartKm) elements.otWinchStartKm.disabled = false;
  if (elements.otWinchStopKm) elements.otWinchStopKm.disabled = false;

  const start = parseFloat(elements.otWinchStartKm?.value);
  const stop = parseFloat(elements.otWinchStopKm?.value);

  if (!isNaN(start) && !isNaN(stop) && stop >= start) {
    const dist = (stop - start).toFixed(1);
    if (elements.otWinchDistanceBadge) elements.otWinchDistanceBadge.textContent = `${dist} KM`;
    if (elements.otWinchDistance) elements.otWinchDistance.value = dist;
  } else {
    if (elements.otWinchDistanceBadge) elements.otWinchDistanceBadge.textContent = '0.0 KM';
    if (elements.otWinchDistance) elements.otWinchDistance.value = '0';
  }
}

if (elements.otWinchStartKm) elements.otWinchStartKm.addEventListener('input', updateWinchDistance);
if (elements.otWinchStopKm) elements.otWinchStopKm.addEventListener('input', updateWinchDistance);
if (elements.otWinchIsStandby) elements.otWinchIsStandby.addEventListener('change', updateWinchDistance);

if (elements.otJobVehicle) {
  elements.otJobVehicle.addEventListener('change', () => {
    const veh = elements.otJobVehicle.value.trim();
    if (!veh) {
      if (elements.otWinchStartKm) {
        elements.otWinchStartKm.value = '';
        elements.otWinchStartKm.placeholder = 'N/A (No vehicle)';
      }
      if (elements.otWinchStopKm) {
        elements.otWinchStopKm.value = '';
        elements.otWinchStopKm.placeholder = 'N/A (No vehicle)';
      }
      if (elements.otWinchDistanceBadge) {
        elements.otWinchDistanceBadge.textContent = '0.0 KM (Optional)';
      }
      if (elements.otWinchDistance) {
        elements.otWinchDistance.value = '0';
      }
      if (elements.otWinchEngineHours) {
        elements.otWinchEngineHours.value = '0';
      }
    } else {
      if (elements.otWinchStartKm) elements.otWinchStartKm.placeholder = 'e.g. 10240';
      if (elements.otWinchStopKm) elements.otWinchStopKm.placeholder = 'e.g. 10285';
      if (elements.otWinchEngineHours && (!elements.otWinchEngineHours.value || elements.otWinchEngineHours.value === '0')) {
        elements.otWinchEngineHours.value = '3.0';
      }
      updateWinchDistance();
    }
  });
}

// Quick Tag click helpers
document.addEventListener('click', (e) => {
  const targetField = e.target.closest('.quick-fill-field');
  if (targetField && elements.otJobFieldLocation) {
    e.preventDefault();
    elements.otJobFieldLocation.value = targetField.getAttribute('data-val');
  }
  const targetWell = e.target.closest('.quick-fill-well');
  if (targetWell && elements.otJobWellSite) {
    e.preventDefault();
    elements.otJobWellSite.value = targetWell.getAttribute('data-val');
  }
  const targetDesc = e.target.closest('.quick-fill-desc');
  if (targetDesc && elements.otJobDescription) {
    e.preventDefault();
    elements.otJobDescription.value = targetDesc.getAttribute('data-val');
    elements.otJobDescription.focus();
  }
});

// Submit Field Job
if (elements.formOtFieldJob) {
  elements.formOtFieldJob.addEventListener('submit', async (e) => {
    e.preventDefault();
    const count = appState.selectedCrewCodes.size;
    if (count < 4 || count > 10) {
      showToast(`Field job requires 4 to 10 crew members. Currently selected: ${count}`, 'error');
      return;
    }

    const date = elements.otJobDate ? elements.otJobDate.value : '';
    const fieldLocation = elements.otJobFieldLocation ? elements.otJobFieldLocation.value.trim() : '';
    const wellSite = elements.otJobWellSite ? elements.otJobWellSite.value.trim() : '';
    const vehicle = elements.otJobVehicle ? elements.otJobVehicle.value.trim() : '';
    const depTime = elements.otJobDepTime ? elements.otJobDepTime.value : '08:30';
    const arrTime = elements.otJobArrTime ? elements.otJobArrTime.value : '16:30';
    const isHoliday = elements.otJobIsHoliday ? elements.otJobIsHoliday.checked : false;

    const jobDescription = elements.otJobDescription ? elements.otJobDescription.value.trim() : 'FBHP CYCLE STUDY';
    const wellRemarks = elements.otJobWellRemarks ? elements.otJobWellRemarks.value.trim() : '';

    if (!date) {
      showToast('Please select field job date', 'warning');
      return;
    }
    if (!fieldLocation) {
      showToast('Please enter or select Field Location (e.g. KHORAGHAT, BORHOLLA)', 'warning');
      elements.otJobFieldLocation?.focus();
      return;
    }
    if (!wellSite) {
      showToast('Please enter or select Well Site (e.g. KH#49, BR#55)', 'warning');
      elements.otJobWellSite?.focus();
      return;
    }
    if (!jobDescription) {
      showToast('Please enter or select a Job Description', 'warning');
      elements.otJobDescription?.focus();
      return;
    }
    if (!wellRemarks) {
      showToast('Please enter Well Operation Remarks (required for OT certification)', 'warning');
      elements.otJobWellRemarks?.focus();
      return;
    }

    // Winch Movement Details (Optional if no vehicle used)
    const isStandby = elements.otWinchIsStandby ? elements.otWinchIsStandby.checked : false;
    const startKm = elements.otWinchStartKm ? parseFloat(elements.otWinchStartKm.value) || 0 : 0;
    const stopKm = elements.otWinchStopKm ? parseFloat(elements.otWinchStopKm.value) || 0 : 0;
    const distance = isStandby ? 0 : Math.max(0, stopKm - startKm);
    const engineHours = elements.otWinchEngineHours ? parseFloat(elements.otWinchEngineHours.value) || (vehicle ? 3.0 : 0) : 0;
    const hsdRemarks = elements.otWinchRemarks ? elements.otWinchRemarks.value.trim() : '';

    const winchMovement = vehicle ? {
      isStandby,
      startKm,
      stopKm,
      distance,
      engineHours,
      hsdRemarks
    } : null;

    try {
      showToast('Logging field job & allocating OT/FD & updating Winch Log...', 'info');
      const res = await fetch('/api/ot-fde/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          fieldLocation,
          wellSite,
          location: `${fieldLocation} - ${wellSite}`,
          vehicle,
          depTime,
          arrTime,
          isHoliday,
          jobDescription,
          wellRemarks,
          remarks: wellRemarks,
          winchMovement,
          crewCodes: Array.from(appState.selectedCrewCodes),
          crew: Array.from(appState.selectedCrewCodes)
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Field Job ${data.job.id} logged & allocated to ${data.job.crew.length} members!`, 'success');
        await fetchOtFdeData();
        // Also refresh Tab 2 Vehicle Log so the new entry reflects there immediately
        if (typeof fetchData === 'function') {
          await fetchData();
        }
        if (elements.otJobWellRemarks) elements.otJobWellRemarks.value = '';
        if (elements.otWinchRemarks) elements.otWinchRemarks.value = '';
        updateLiveJobPreview();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to save field job: ' + err.message, 'error');
    }
  });
}

// Period Mode Switcher (Month-wise vs Year-wise)
function setOtPeriodMode(mode) {
  appState.activeOtPeriodMode = mode;

  if (mode === 'year') {
    if (elements.btnOtPeriodMonth) elements.btnOtPeriodMonth.classList.remove('active');
    if (elements.btnOtPeriodYear) elements.btnOtPeriodYear.classList.add('active');
    if (elements.otMonthlyContainer) elements.otMonthlyContainer.style.display = 'none';
    if (elements.otYearlyContainer) elements.otYearlyContainer.style.display = 'flex';
    if (elements.otPeriodModeHint) {
      elements.otPeriodModeHint.innerHTML = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700; font-size: 0.76rem;">Mode: Year-wise Summary</span>';
    }
    renderOtYearlySummary();
  } else {
    if (elements.btnOtPeriodMonth) elements.btnOtPeriodMonth.classList.add('active');
    if (elements.btnOtPeriodYear) elements.btnOtPeriodYear.classList.remove('active');
    if (elements.otMonthlyContainer) elements.otMonthlyContainer.style.display = 'block';
    if (elements.otYearlyContainer) elements.otYearlyContainer.style.display = 'none';
    if (elements.otPeriodModeHint) {
      elements.otPeriodModeHint.innerHTML = '<span class="badge" style="background: rgba(0, 112, 242, 0.15); color: #0070f2; font-weight: 700; font-size: 0.76rem;">Mode: Month-by-Month Claim</span>';
    }
    renderOtStatement();
  }
}
window.setOtPeriodMode = setOtPeriodMode;

// Jump to a specific month from yearly table
function jumpToMonth(monthKey) {
  if (elements.otStatementMonth) {
    elements.otStatementMonth.value = monthKey;
    appState.activeOtStatementMonth = monthKey;
  }
  setOtPeriodMode('month');
  showToast(`Switched to Monthly Statement for ${monthKey}`, 'info');
}
window.jumpToMonth = jumpToMonth;

// Jump to a specific employee from yearly table
function jumpToEmployee(empCode) {
  if (elements.otStatementEmployee) {
    elements.otStatementEmployee.value = empCode;
    appState.activeOtStatementEmployee = empCode;
  }
  setOtPeriodMode('month');
  showToast(`Viewing statement for Employee ${empCode}`, 'info');
}
window.jumpToEmployee = jumpToEmployee;

// OT Statement (Month-wise)
async function renderOtStatement() {
  const empCode = (elements.otStatementEmployee ? elements.otStatementEmployee.value : null) || appState.activeOtStatementEmployee || 'UC';
  const month = (elements.otStatementMonth ? elements.otStatementMonth.value : null) || appState.activeOtStatementMonth || '2025-01';

  try {
    const res = await fetch(`/api/ot-fde/statement?empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`);
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to load statement', 'error');
      return;
    }

    // Check if ALL CREW is selected
    if (empCode === 'ALL') {
      const allOt = data.allOt || {};
      const crewList = Object.values(allOt);

      let totalFleetOtHours = 0;
      let totalFleetOtAmount = 0;
      let totalFleetTrips = 0;
      crewList.forEach(item => {
        totalFleetOtHours += (item.totalOtHours || 0);
        totalFleetOtAmount += (item.totalOtAmount || 0);
        totalFleetTrips += (item.dutyDays || item.entries?.length || 0);
      });

      if (elements.otEmpMetaBox) {
        elements.otEmpMetaBox.innerHTML = `
          <div class="meta-item">
            <span class="meta-label">REPORT TYPE</span>
            <span class="meta-value" style="color: #0070f2; font-weight:800;">FLEET OVERVIEW • ALL CREW</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">SECTION / ASSET</span>
            <span class="meta-value">SST JORHAT • ASSAM ASSET</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">CLAIM MONTH</span>
            <span class="meta-value font-mono" style="font-weight:800;">${escapeHtml(month)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">TOTAL CREW PERSONNEL</span>
            <span class="meta-value">${crewList.length} Active Officers &amp; Staff</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">NORMAL DUTY HOURS</span>
            <span class="meta-value">08:30 to 16:30 (8.0 hrs/shift)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">MINES ACT OT FORMULA</span>
            <span class="meta-value font-mono">Floor((Basic + DA) / 104)</span>
          </div>
        `;
      }

      if (elements.kpiOtTotalHours) elements.kpiOtTotalHours.textContent = `${totalFleetOtHours.toFixed(1)} hrs`;
      if (elements.kpiOtHourlyRate) elements.kpiOtHourlyRate.textContent = `Fleet Average`;
      if (elements.kpiOtTotalAmount) elements.kpiOtTotalAmount.textContent = `₹${totalFleetOtAmount.toLocaleString('en-IN')}`;
      if (elements.kpiOtDutyDays) elements.kpiOtDutyDays.textContent = `${totalFleetTrips} Crew Shifts`;

      if (elements.otStatementTableBody) {
        elements.otStatementTableBody.innerHTML = crewList.map((st, idx) => {
          const emp = st.employee || {};
          const trips = st.dutyDays || st.entries?.length || 0;
          return `
            <tr>
              <td class="text-center font-mono">${idx + 1}</td>
              <td style="font-weight: 700;">
                <div style="color: var(--text-main); font-size: 13px;">${escapeHtml(emp.name)}</div>
                <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(emp.code)} • CPF: ${escapeHtml(emp.cpf || '—')}</span>
              </td>
              <td>${escapeHtml(emp.designation || 'JMVD')}</td>
              <td>08:30 - 16:30</td>
              <td style="font-weight: 800; font-family: monospace; color: ${st.totalOtHours > 0 ? '#b91c1c' : '#15803d'}; font-size: 13px;" class="text-center">
                ${st.totalOtHours.toFixed(1)} hrs
              </td>
              <td>
                <div style="font-weight: 600;">${trips} Field Duty Trips in ${escapeHtml(month)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">Basic: ₹${Number(emp.basicPay||0).toLocaleString('en-IN')} | DA: ₹${Number(emp.da||0).toLocaleString('en-IN')}</div>
              </td>
              <td class="text-center"><span class="badge" style="background: rgba(0, 112, 242, 0.15); color: #0070f2; font-weight:700;">${trips} Trips</span></td>
              <td class="text-center font-mono font-bold">₹${emp.otRate}/hr</td>
              <td style="font-weight: 800; color: ${st.totalOtAmount > 0 ? '#b91c1c' : 'var(--text-muted)'}; font-size: 13px;" class="text-right font-mono">
                ₹${Number(st.totalOtAmount).toLocaleString('en-IN')}
              </td>
            </tr>
          `;
        }).join('');
      }

      if (elements.otStatementTableFoot) {
        elements.otStatementTableFoot.innerHTML = `
          <tr style="background: var(--sap-table-header-bg); font-weight: 800; border-top: 2px solid var(--sap-primary);">
            <td colspan="4" class="text-right" style="text-align: right; padding-right: 15px;">TOTAL FLEET OVERTIME CLAIM (${escapeHtml(month)}):</td>
            <td class="text-center" style="color: #b91c1c; font-size: 14px; font-family: monospace;">${totalFleetOtHours.toFixed(1)} hrs</td>
            <td colspan="3"></td>
            <td style="color: #b91c1c; font-size: 15px; font-family: monospace;" class="text-right">₹${totalFleetOtAmount.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }
      return;
    }

    const emp = data.otStatement.employee;
    const entries = data.otStatement.entries || [];

    if (elements.otEmpMetaBox) {
      elements.otEmpMetaBox.innerHTML = `
        <div class="meta-item">
          <span class="meta-label">EMPLOYEE NAME</span>
          <span class="meta-value">${escapeHtml(emp.name)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">CPF NUMBER</span>
          <span class="meta-value">${escapeHtml(emp.cpf || '140751')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">DESIGNATION</span>
          <span class="meta-value">${escapeHtml(emp.designation || 'JMVD(W.O.)')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">SECTION / BASE</span>
          <span class="meta-value">${escapeHtml(emp.section || 'SST')}, ${escapeHtml(emp.location || 'JORHAT')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">BASIC PAY</span>
          <span class="meta-value">₹${Number(emp.basicPay || 0).toLocaleString('en-IN')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">DA (DEARNESS ALLOWANCE)</span>
          <span class="meta-value">₹${Number(emp.da || 0).toLocaleString('en-IN')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">MINES ACT OT RATE</span>
          <span class="meta-value" style="color: #1e40af; font-weight:800;">₹${emp.otRate}/hr</span>
        </div>
      `;
    }

    if (elements.kpiOtTotalHours) elements.kpiOtTotalHours.textContent = `${data.otStatement.totalOtHours.toFixed(1)} hrs`;
    if (elements.kpiOtHourlyRate) elements.kpiOtHourlyRate.textContent = `₹${emp.otRate}/hr`;
    if (elements.kpiOtTotalAmount) elements.kpiOtTotalAmount.textContent = `₹${data.otStatement.totalOtAmount.toLocaleString('en-IN')}`;
    if (elements.kpiOtDutyDays) elements.kpiOtDutyDays.textContent = `${data.otStatement.dutyDays || entries.length} Days`;

    if (elements.otStatementTableBody) {
      if (entries.length === 0) {
        elements.otStatementTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No field duty entries recorded for ${escapeHtml(emp.name)} in ${escapeHtml(month)}.</td></tr>`;
      } else {
        elements.otStatementTableBody.innerHTML = entries.map((e, idx) => {
          const isZeroOt = e.otHours === 0;
          return `
            <tr style="${isZeroOt ? 'opacity: 0.85; background: rgba(0,0,0,0.01);' : ''}">
              <td class="text-center font-mono">${idx + 1}</td>
              <td style="font-weight: 600;">
                <div>${escapeHtml(e.date)}</div>
                <span style="font-size: 10px; color: var(--sap-text-muted); font-weight: 700;">${getDayName(e.date)}</span>
              </td>
              <td>08:30 - 16:30</td>
              <td>${escapeHtml(e.depTime)} - ${escapeHtml(e.arrTime)}</td>
              <td style="font-weight: 800; font-family: monospace; color: ${isZeroOt ? '#15803d' : '#b91c1c'}; font-size: 13px;" class="text-center">
                ${e.otHours.toFixed(1)} hrs
                ${isZeroOt ? '<span class="badge" style="font-size:9px; background:#dcfce7; color:#166534; display:block;">Normal Duty</span>' : ''}
              </td>
              <td style="max-width: 260px;">
                <div style="font-weight: 600; color: var(--sap-primary);">${escapeHtml(e.location)}</div>
                <div style="font-size: 11px; color: var(--sap-text-muted); white-space: normal;">${escapeHtml(e.remarks || 'Winch Logging / Reservoir Survey')}</div>
              </td>
              <td class="text-center"><span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700;">${escapeHtml(e.vehicle || 'WINCH')}</span></td>
              <td class="font-mono text-center">₹${e.otRate}</td>
              <td style="font-weight: 800; color: ${e.otAmount > 0 ? '#b91c1c' : 'var(--sap-text-muted)'}; font-size: 13px;" class="font-mono text-right">
                ₹${Number(e.otAmount).toLocaleString('en-IN')}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    if (elements.otStatementTableFoot) {
      elements.otStatementTableFoot.innerHTML = `
        <tr style="background: var(--sap-table-header-bg); font-weight: 800; border-top: 2px solid var(--sap-primary);">
          <td colspan="4" class="text-right" style="text-align: right; padding-right: 15px;">TOTAL OT CLAIM (FORM NO. CLM-MIS-02):</td>
          <td class="text-center" style="color: #b91c1c; font-size: 14px; font-family: monospace;">${data.otStatement.totalOtHours.toFixed(1)} hrs</td>
          <td colspan="3"></td>
          <td style="color: #b91c1c; font-size: 15px; font-family: monospace;" class="text-right">₹${data.otStatement.totalOtAmount.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }

  } catch (err) {
    console.error('Failed to load OT statement:', err);
  }
}

// Year-wise Overtime Analytics & Report Renderer
async function renderOtYearlySummary() {
  const year = (elements.otYearSelect ? elements.otYearSelect.value : null) || appState.activeOtYear || '2025';
  const crewFilter = (elements.otYearCrewFilter ? elements.otYearCrewFilter.value : null) || appState.activeOtYearCrew || 'ALL';

  try {
    const res = await fetch(`/api/ot-fde/yearly-statement?year=${encodeURIComponent(year)}&employee=${encodeURIComponent(crewFilter)}`);
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to load yearly OT summary', 'error');
      return;
    }

    const summary = data.summary || {};
    const months = data.months || [];
    let employees = data.employees || [];

    // Filter employees if specific crew member chosen
    if (crewFilter !== 'ALL') {
      employees = employees.filter(e => e.code === crewFilter);
    }

    if (elements.annualYearLabel) elements.annualYearLabel.textContent = year === 'ALL' ? 'All Years' : year;

    // Populate Year Select if empty
    if (elements.otYearSelect && data.availableYears) {
      const cur = elements.otYearSelect.value;
      const opts = data.availableYears.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`);
      opts.push(`<option value="ALL" ${year === 'ALL' ? 'selected' : ''}>All Years</option>`);
      elements.otYearSelect.innerHTML = opts.join('');
    }

    // Update KPI Cards
    if (elements.kpiYearOtHours) elements.kpiYearOtHours.textContent = `${summary.totalOtHours.toFixed(1)} hrs`;
    if (elements.kpiYearOtAmount) elements.kpiYearOtAmount.textContent = `₹${Number(summary.totalOtAmount).toLocaleString('en-IN')}`;
    if (elements.kpiYearTrips) elements.kpiYearTrips.textContent = `${summary.totalJobs} Trips`;
    if (elements.kpiYearHoursSub) elements.kpiYearHoursSub.textContent = `${summary.totalFieldHours.toFixed(1)} Total Field Hours`;
    if (elements.kpiYearPeakMonth) elements.kpiYearPeakMonth.textContent = summary.peakOtMonth || 'None';
    if (elements.kpiYearCrewCount) elements.kpiYearCrewCount.textContent = `${summary.totalCrewCount || 12} Active Personnel`;

    // Render Month-by-Month Table (12 Months)
    if (elements.otYearMonthsTableBody) {
      elements.otYearMonthsTableBody.innerHTML = months.map(m => {
        const hasTrips = m.totalTrips > 0;
        return `
          <tr style="${!hasTrips ? 'opacity: 0.65;' : ''}">
            <td style="font-weight: 700;">
              <span style="color: var(--text-main); font-size: 13px;">${escapeHtml(m.monthName)}</span>
              <span style="font-size: 10px; color: var(--text-muted); display: block;">${escapeHtml(m.monthKey)}</span>
            </td>
            <td class="text-center font-mono font-bold">${m.totalTrips}</td>
            <td class="text-center font-mono">${m.totalFieldHours.toFixed(1)}</td>
            <td class="text-center font-mono font-bold" style="color: ${m.totalOtHours > 0 ? '#b91c1c' : '#10b981'}; font-size: 13px;">
              ${m.totalOtHours.toFixed(1)} hrs
            </td>
            <td class="text-right font-mono font-bold" style="color: ${m.totalOtAmount > 0 ? '#b91c1c' : 'var(--text-muted)'};">
              ₹${Number(m.totalOtAmount).toLocaleString('en-IN')}
            </td>
            <td class="text-right font-mono" style="color: #0d5c75;">
              ₹${Number(m.totalFdAmount).toLocaleString('en-IN')}
            </td>
            <td class="text-right font-mono font-bold" style="color: #1e3a8a;">
              ₹${Number(m.combinedAmount).toLocaleString('en-IN')}
            </td>
            <td class="text-center">
              <span class="badge" style="background: rgba(0, 112, 242, 0.12); color: #0070f2; font-weight:700;">
                ${m.activeCrewCount || 0} Crew
              </span>
            </td>
            <td class="text-center">
              <button type="button" class="btn btn-secondary btn-xs" onclick="jumpToMonth('${m.monthKey}')" title="Open detailed claim statement for ${m.monthName}">
                🔍 View
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (elements.otYearMonthsTableFoot) {
      elements.otYearMonthsTableFoot.innerHTML = `
        <tr style="background: var(--sap-table-header-bg); border-top: 2px solid var(--sap-primary);">
          <td>ANNUAL FLEET TOTAL:</td>
          <td class="text-center font-mono">${summary.totalJobs}</td>
          <td class="text-center font-mono">${summary.totalFieldHours.toFixed(1)}</td>
          <td class="text-center font-mono" style="color: #b91c1c;">${summary.totalOtHours.toFixed(1)} hrs</td>
          <td class="text-right font-mono" style="color: #b91c1c;">₹${summary.totalOtAmount.toLocaleString('en-IN')}</td>
          <td class="text-right font-mono" style="color: #0d5c75;">₹${summary.totalFdAmount.toLocaleString('en-IN')}</td>
          <td class="text-right font-mono" style="color: #1e3a8a; font-size: 14px;">₹${summary.totalCombinedAmount.toLocaleString('en-IN')}</td>
          <td colspan="2"></td>
        </tr>
      `;
    }

    // Render Crew-wise Annual Summary Table
    if (elements.otYearCrewTableBody) {
      const maxOtHours = Math.max(...employees.map(e => e.totalOtHours || 0), 1);

      elements.otYearCrewTableBody.innerHTML = employees.map((emp, idx) => {
        const rankClass = idx === 0 ? 'top1' : (idx === 1 ? 'top2' : (idx === 2 ? 'top3' : ''));
        const pct = Math.min(100, Math.round((emp.totalOtHours / maxOtHours) * 100));

        return `
          <tr>
            <td class="text-center">
              <span class="ot-rank-badge ${rankClass}">#${idx + 1}</span>
            </td>
            <td style="font-weight: 700;">
              <div style="color: var(--text-main);">${escapeHtml(emp.name)}</div>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${escapeHtml(emp.code)}</span>
            </td>
            <td class="text-center font-mono font-bold">${escapeHtml(emp.cpf || '—')}</td>
            <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(emp.designation || 'JMVD')}</td>
            <td class="text-center font-mono font-bold">₹${emp.otRate}/hr</td>
            <td class="text-center font-mono font-bold">${emp.totalTrips}</td>
            <td class="text-center font-mono font-bold" style="color: #b91c1c; font-size: 13px;">
              ${emp.totalOtHours.toFixed(1)} hrs
            </td>
            <td class="text-right font-mono font-bold" style="color: #b91c1c;">
              ₹${Number(emp.totalOtAmount).toLocaleString('en-IN')}
            </td>
            <td class="text-right font-mono font-bold" style="color: #1e3a8a;">
              ₹${Number(emp.combinedAmount).toLocaleString('en-IN')}
            </td>
            <td style="min-width: 110px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700;">
                <span>${pct}%</span>
              </div>
              <div class="ot-bar-container">
                <div class="ot-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </td>
            <td class="text-center">
              <button type="button" class="btn btn-secondary btn-xs" onclick="jumpToEmployee('${emp.code}')" title="Inspect ${emp.name}">
                Statement
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (elements.otYearCrewTableFoot) {
      elements.otYearCrewTableFoot.innerHTML = `
        <tr style="background: var(--sap-table-header-bg); border-top: 2px solid var(--sap-primary);">
          <td colspan="5" class="text-right" style="text-align: right; padding-right: 15px;">FLEET ANNUAL SUMMARY TOTAL:</td>
          <td class="text-center font-mono">${summary.totalJobs}</td>
          <td class="text-center font-mono" style="color: #b91c1c;">${summary.totalOtHours.toFixed(1)} hrs</td>
          <td class="text-right font-mono" style="color: #b91c1c;">₹${summary.totalOtAmount.toLocaleString('en-IN')}</td>
          <td class="text-right font-mono" style="color: #1e3a8a; font-size: 14px;">₹${summary.totalCombinedAmount.toLocaleString('en-IN')}</td>
          <td colspan="2"></td>
        </tr>
      `;
    }

  } catch (err) {
    console.error('Failed to load yearly OT summary:', err);
  }
}
window.renderOtYearlySummary = renderOtYearlySummary;

// FDE Statement
async function renderFdeStatement() {
  const empCode = (elements.fdeStatementEmployee ? elements.fdeStatementEmployee.value : null) || appState.activeFdeStatementEmployee || 'UC';
  const month = (elements.fdeStatementMonth ? elements.fdeStatementMonth.value : null) || appState.activeFdeStatementMonth || '2025-01';

  try {
    const res = await fetch(`/api/ot-fde/statement?empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`);
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to load statement', 'error');
      return;
    }

    const emp = data.fdeStatement.employee;
    const entries = data.fdeStatement.entries || [];

    if (elements.fdeEmpMetaBox) {
      elements.fdeEmpMetaBox.innerHTML = `
        <div class="meta-item">
          <span class="meta-label">EMPLOYEE NAME</span>
          <span class="meta-value">${escapeHtml(emp.name)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">CPF NUMBER</span>
          <span class="meta-value">${escapeHtml(emp.cpf || '140751')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">DESIGNATION</span>
          <span class="meta-value">${escapeHtml(emp.designation || 'JMVD(W.O.)')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">BASE / LOCATION</span>
          <span class="meta-value">${escapeHtml(emp.section || 'SST')}, ${escapeHtml(emp.location || 'JORHAT')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">FIXED FD RATE</span>
          <span class="meta-value" style="color: #047857; font-weight:800;">₹450 / 8-hr Shift</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">CLAIM MONTH</span>
          <span class="meta-value" style="font-weight:700;">${escapeHtml(month)}</span>
        </div>
      `;
    }

    if (elements.kpiFdeTotalHours) elements.kpiFdeTotalHours.textContent = `${data.fdeStatement.totalFieldHours.toFixed(1)} hrs`;
    if (elements.kpiFdeTotalShifts) elements.kpiFdeTotalShifts.textContent = `${data.fdeStatement.totalShifts.toFixed(3)} Shifts`;
    if (elements.kpiFdeTotalAmount) elements.kpiFdeTotalAmount.textContent = `₹${Math.round(data.fdeStatement.totalFdAmount).toLocaleString('en-IN')}`;

    if (elements.fdeStatementTableBody) {
      if (entries.length === 0) {
        elements.fdeStatementTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No field duty entries recorded for ${escapeHtml(emp.name)} in ${escapeHtml(month)}.</td></tr>`;
      } else {
        elements.fdeStatementTableBody.innerHTML = entries.map((e, idx) => `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td style="font-weight: 600;">
              <div>${escapeHtml(e.date)}</div>
              <span style="font-size: 10px; color: var(--sap-text-muted); font-weight: 700;">${getDayName(e.date)}</span>
            </td>
            <td style="max-width: 250px;">
              <div style="font-weight: 600; color: var(--sap-primary);">${escapeHtml(e.location)}</div>
              <div style="font-size: 11px; color: var(--sap-text-muted); white-space: normal;">${escapeHtml(e.remarks || 'Reservoir Winch Survey')}</div>
            </td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700;">${escapeHtml(e.vehicle || 'WINCH')}</span></td>
            <td>${escapeHtml(e.depTime)}</td>
            <td>${escapeHtml(e.arrTime)}</td>
            <td style="font-weight: 700;" class="font-mono">${Number(e.dutyHours).toFixed(1)} hrs</td>
            <td style="font-weight: 700; color: #1e40af;" class="font-mono">${Number(e.fdShifts).toFixed(3)}</td>
            <td class="font-mono">₹450</td>
            <td style="font-weight: 800; color: #047857; font-size: 13px;" class="font-mono">
              ₹${Number(e.fdAmount).toFixed(2)}
            </td>
          </tr>
        `).join('');
      }
    }

    if (elements.fdeStatementTableFoot) {
      elements.fdeStatementTableFoot.innerHTML = `
        <tr style="background: var(--sap-table-header-bg); font-weight: 800; border-top: 2px solid var(--sap-primary);">
          <td colspan="6" class="text-right" style="text-align: right; padding-right: 15px;">TOTAL FDE CLAIM (FORM NO. CLM-MIS-02):</td>
          <td style="font-family: monospace;">${data.fdeStatement.totalFieldHours.toFixed(1)} hrs</td>
          <td style="color: #1e40af; font-family: monospace;">${data.fdeStatement.totalShifts.toFixed(3)}</td>
          <td></td>
          <td style="color: #047857; font-size: 15px; font-family: monospace;">₹${Math.round(data.fdeStatement.totalFdAmount).toLocaleString('en-IN')}</td>
        </tr>
      `;
    }

  } catch (err) {
    console.error('Failed to load FDE statement:', err);
  }
}

// All Jobs Table
function renderAllJobsTable() {
  if (!elements.otAllJobsTableBody || !appState.otFdeData) return;
  const jobs = appState.otFdeData.jobs || [];
  const q = (appState.otAllJobsSearchQuery || '').toLowerCase();

  const filtered = jobs.filter(j => {
    if (!q) return true;
    return (j.date && j.date.toLowerCase().includes(q)) ||
           (j.location && j.location.toLowerCase().includes(q)) ||
           (j.vehicle && j.vehicle.toLowerCase().includes(q)) ||
           (j.remarks && j.remarks.toLowerCase().includes(q)) ||
           (j.crew && j.crew.some(c => c.toLowerCase().includes(q)));
  });

  if (filtered.length === 0) {
    elements.otAllJobsTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No field jobs match the current search filter.</td></tr>`;
    return;
  }

  elements.otAllJobsTableBody.innerHTML = filtered.map((j, idx) => {
    const crewBadges = (j.crew || []).map(c => `<span class="badge" style="background:#e0e7ff; color:#3730a3; margin-right:4px; font-size:10px; font-weight:700;">${escapeHtml(c)}</span>`).join('');
    return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td style="font-weight: 600;">
          <div>${escapeHtml(j.date)}</div>
          <span style="font-size:10px; color:var(--sap-text-muted);">${getDayName(j.date)}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--sap-primary);">${escapeHtml(j.location)}</div>
          <div style="font-size: 11px; color: var(--sap-text-muted); max-width: 250px;">${escapeHtml(j.remarks || '—')}</div>
        </td>
        <td><span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700;">${escapeHtml(j.vehicle || 'None')}</span></td>
        <td>${escapeHtml(j.depTime)} - ${escapeHtml(j.arrTime)}</td>
        <td class="font-mono font-bold">${Number(j.dutyHours || 0).toFixed(1)} hrs</td>
        <td class="font-mono font-bold" style="color: ${j.otHours > 0 ? '#b91c1c' : '#15803d'};">
          ${Number(j.otHours || 0).toFixed(1)} hrs
        </td>
        <td>${crewBadges}</td>
        <td>
          <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 11px; color: #dc2626; border-color: #fca5a5;" onclick="deleteOtJob('${j.id}')">
            <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">delete</span> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteOtJob = async function(jobId) {
  if (!confirm(`Are you sure you want to delete Field Job ${jobId}? This will remove it from all crew statements.`)) {
    return;
  }
  try {
    const res = await fetch(`/api/ot-fde/job/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Field Job deleted', 'success');
      await fetchOtFdeData();
      renderAllJobsTable();
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
};

// Employee Roster
function renderEmployeeRoster() {
  if (!elements.otRosterTableBody || !appState.otFdeData || !appState.otFdeData.roster) return;
  const roster = appState.otFdeData.roster;
  const filter = appState.rosterFilter || 'active';

  const allEmployees = Object.values(roster);
  const activeCount = allEmployees.filter(e => e.status !== 'retired').length;
  const retiredCount = allEmployees.filter(e => e.status === 'retired').length;

  if (elements.btnRosterFilterActive) elements.btnRosterFilterActive.textContent = `Active (${activeCount})`;
  if (elements.btnRosterFilterRetired) elements.btnRosterFilterRetired.textContent = `Retired (${retiredCount})`;
  if (elements.btnRosterFilterAll) elements.btnRosterFilterAll.textContent = `All (${allEmployees.length})`;

  const filtered = allEmployees.filter(emp => {
    if (filter === 'active') return emp.status !== 'retired';
    if (filter === 'retired') return emp.status === 'retired';
    return true;
  });

  if (filtered.length === 0) {
    elements.otRosterTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No employees in the ${filter} crew roster.</td></tr>`;
    return;
  }

  elements.otRosterTableBody.innerHTML = filtered.map((emp, idx) => {
    const isRetired = emp.status === 'retired';
    const statusBadge = isRetired
      ? `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:10px; font-weight:800; margin-left:4px;" title="Superannuated / Retired on ${escapeHtml(emp.retirementInfo?.date || '')}">🏖️ Retired</span>`
      : '';
    const promoBadge = emp.lastPromotion
      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 10px; font-weight: 800; margin-left: 4px;" title="Promoted to ${escapeHtml(emp.designation)} on ${escapeHtml(emp.lastPromotion.date)}">🎖️ Promoted</span>`
      : '';

    return `
      <tr style="${isRetired ? 'opacity: 0.72; background: rgba(0,0,0,0.02);' : ''}">
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="text-center">
          <span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:800; font-size:12px;">${escapeHtml(emp.code)}</span>
        </td>
        <td class="text-center font-mono font-bold">${escapeHtml(emp.cpf || '—')}</td>
        <td style="font-weight: 700; color: var(--text-main); font-size:13px;">${escapeHtml(emp.name)}</td>
        <td>
          <div style="font-weight: 700; color: #0284c7; font-size: 12.5px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>${escapeHtml(emp.designation || '—')}</span>
            ${statusBadge}
            ${promoBadge}
          </div>
        </td>
        <td class="text-right font-mono font-bold">₹${Number(emp.basicPay || 0).toLocaleString('en-IN')}</td>
        <td class="text-right font-mono font-bold">₹${Number(emp.da || 0).toLocaleString('en-IN')}</td>
        <td class="text-center font-mono font-bold" style="color: #ef4444; font-size: 13px;">₹${emp.otRate}/hr</td>
        <td class="text-center font-mono font-bold" style="color: #0d5c75;">₹${emp.fdRate || 450}/shift</td>
        <td class="text-center">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
            <button type="button" class="btn btn-secondary btn-xs" style="padding: 4px 8px; font-size: 11px;" onclick="openEditEmployeeModal('${emp.code}', 'profile')" title="Edit Profile & Pay">
              <span class="material-symbols-rounded" style="font-size: 13px; vertical-align: middle;">edit</span> Edit
            </button>
            <button type="button" class="btn btn-primary btn-xs" style="background: #059669; border-color: #059669; padding: 4px 10px; font-size: 11px; font-weight: 700;" onclick="openEditEmployeeModal('${emp.code}', 'promotion')" title="Grant Promotion">
              Promote
            </button>

          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Edit Employee & Promotion Modal
window.openEditEmployeeModal = function(code, defaultTab = 'profile') {
  const emp = appState.otFdeData?.roster?.[code];
  if (!emp) {
    showToast(`Employee ${code} not found`, 'error');
    return;
  }

  // Populate Base Profile Fields
  if (elements.otEditEmpCode) elements.otEditEmpCode.value = emp.code;
  if (elements.otEditEmpName) elements.otEditEmpName.value = emp.name;
  if (elements.otEditEmpCpf) elements.otEditEmpCpf.value = emp.cpf || '';
  if (elements.otEditEmpDesignation) elements.otEditEmpDesignation.value = emp.designation || '';
  if (elements.otEditEmpBasicPay) elements.otEditEmpBasicPay.value = emp.basicPay || 0;
  if (elements.otEditEmpDa) elements.otEditEmpDa.value = emp.da || 0;

  // Header Displays
  if (elements.otEditEmpHeader) elements.otEditEmpHeader.textContent = emp.name;
  if (elements.otEditEmpCodeBadge) elements.otEditEmpCodeBadge.textContent = emp.code;
  if (elements.otEditEmpCpfDisplay) elements.otEditEmpCpfDisplay.textContent = emp.cpf || '—';
  if (elements.otEditEmpCurrentDesig) elements.otEditEmpCurrentDesig.textContent = emp.designation || '—';
  if (elements.otEditCurrentOtRateBadge) elements.otEditCurrentOtRateBadge.textContent = `₹${emp.otRate}/hr`;

  // Status & Retirement Text
  const isRetired = emp.status === 'retired';
  if (elements.otEditStatusText) {
    elements.otEditStatusText.innerHTML = isRetired
      ? `<span style="color:#ef4444; font-weight:700;">Status: Retired / Superannuated</span>${emp.retirementInfo?.date ? ' (w.e.f ' + escapeHtml(emp.retirementInfo.date) + ')' : ''}`
      : `<span style="color:#10b981; font-weight:700;">Status: Active Crew Member</span>`;
  }
  if (elements.btnToggleRetireEmployee) {
    elements.btnToggleRetireEmployee.innerHTML = isRetired ? '🔄 Reactivate to Active' : '🏖️ Mark as Retired';
    elements.btnToggleRetireEmployee.style.color = isRetired ? '#059669' : '';
  }

  // Determine Next Cadre Suggestion for Promotion
  const curDesig = (emp.designation || '').toUpperCase();
  let nextCadre = '';
  if (curDesig.includes('DY T') || curDesig.includes('DY. T') || curDesig.includes('ASST TECH')) {
    nextCadre = 'TECH (FITTING)';
  } else if (curDesig.includes('TECH (FITTING)')) {
    nextCadre = 'SR TECH (FITTING)';
  } else if (curDesig.includes('SR TECH')) {
    nextCadre = 'CHARGEMAN (FITTING)';
  } else if (curDesig.includes('JMVD')) {
    nextCadre = 'MVD(WO)';
  } else if (curDesig.includes('MVD') && !curDesig.includes('SR')) {
    nextCadre = 'SR MVD';
  } else if (curDesig.includes('SR MVD')) {
    nextCadre = 'CHIEF MVD';
  } else if (curDesig.includes('EA(M)')) {
    nextCadre = 'AEE(M)';
  } else if (curDesig.includes('AEE')) {
    nextCadre = 'EE(M)';
  } else if (curDesig.includes('JR KHALASHI')) {
    nextCadre = 'KHALASHI';
  } else if (curDesig === 'KHALASHI') {
    nextCadre = 'SR KHALASHI';
  } else {
    nextCadre = curDesig;
  }

  if (elements.otPromoTargetDesignation) elements.otPromoTargetDesignation.value = nextCadre;

  // Calculate Standard ONGC 3% Promotional Increment
  const curBasic = parseFloat(emp.basicPay) || 0;
  const inc3pct = Math.round(curBasic * 0.03);
  const promoNewBasic = Math.ceil((curBasic + inc3pct) / 10) * 10;

  if (elements.otPromoNewBasicPay) elements.otPromoNewBasicPay.value = promoNewBasic;
  if (elements.otPromoIncrementExplainer) {
    elements.otPromoIncrementExplainer.textContent = `Basic ₹${curBasic.toLocaleString('en-IN')} + 3% (₹${inc3pct.toLocaleString('en-IN')}) ➔ New Promoted Basic: ₹${promoNewBasic.toLocaleString('en-IN')}`;
  }
  if (elements.otPromoDate) {
    elements.otPromoDate.value = new Date().toISOString().slice(0, 10);
  }
  if (elements.otPromoOrderNo) {
    elements.otPromoOrderNo.value = `ONGC/SST/PROM/${new Date().getFullYear()}/${emp.cpf || emp.code}`;
  }
  if (elements.otPromoRemarks) {
    elements.otPromoRemarks.value = `Promoted from ${emp.designation} to ${nextCadre} w.e.f ${new Date().toLocaleDateString('en-GB')}`;
  }
  if (elements.otPromoAutoIncrementCheck) {
    elements.otPromoAutoIncrementCheck.checked = true;
  }

  // Switch to selected tab and update preview
  switchEmployeeModalTab(defaultTab);
  openModal(elements.otEditEmployeeModal);
};

// Modal Tab Switcher
function switchEmployeeModalTab(tab) {
  if (elements.otModalActiveMode) elements.otModalActiveMode.value = tab;

  if (tab === 'promotion') {
    if (elements.btnTabModalPromotion) elements.btnTabModalPromotion.classList.add('active');
    if (elements.btnTabModalProfile) elements.btnTabModalProfile.classList.remove('active');
    if (elements.secModalPromotion) elements.secModalPromotion.style.display = 'flex';
    if (elements.secModalProfile) elements.secModalProfile.style.display = 'none';
    if (elements.btnSaveEditEmp) {
      elements.btnSaveEditEmp.innerHTML = 'Confirm Promotion &amp; Update Pay';
      elements.btnSaveEditEmp.style.background = '#059669';
      elements.btnSaveEditEmp.style.borderColor = '#059669';
    }
  } else {
    if (elements.btnTabModalProfile) elements.btnTabModalProfile.classList.add('active');
    if (elements.btnTabModalPromotion) elements.btnTabModalPromotion.classList.remove('active');
    if (elements.secModalProfile) elements.secModalProfile.style.display = 'flex';
    if (elements.secModalPromotion) elements.secModalPromotion.style.display = 'none';
    if (elements.btnSaveEditEmp) {
      elements.btnSaveEditEmp.innerHTML = 'Update Employee Profile';
      elements.btnSaveEditEmp.style.background = '';
      elements.btnSaveEditEmp.style.borderColor = '';
    }
  }
  updateModalCalculatedRate();
}

// Live Mines Act OT Rate Calculation Preview
function updateModalCalculatedRate() {
  const code = elements.otEditEmpCode?.value;
  const emp = appState.otFdeData?.roster?.[code];
  const oldRate = emp ? emp.otRate : 400;

  const isPromoMode = elements.otModalActiveMode?.value === 'promotion';
  let basic = 0;
  if (isPromoMode) {
    basic = parseFloat(elements.otPromoNewBasicPay?.value) || parseFloat(elements.otEditEmpBasicPay?.value) || 0;
  } else {
    basic = parseFloat(elements.otEditEmpBasicPay?.value) || 0;
  }
  const da = parseFloat(elements.otEditEmpDa?.value) || 0;
  const newRate = Math.floor((basic + da) / 104);

  if (elements.otEditCalculatedRate) {
    elements.otEditCalculatedRate.textContent = `₹${newRate} / hr`;
  }
  if (elements.otRateDeltaBadge) {
    const diff = newRate - oldRate;
    if (diff > 0) {
      elements.otRateDeltaBadge.style.display = 'inline-block';
      elements.otRateDeltaBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      elements.otRateDeltaBadge.style.color = '#10b981';
      elements.otRateDeltaBadge.textContent = `+₹${diff} / hr (+${Math.round((diff / oldRate) * 100)}%)`;
    } else if (diff < 0) {
      elements.otRateDeltaBadge.style.display = 'inline-block';
      elements.otRateDeltaBadge.style.background = 'rgba(239, 68, 68, 0.15)';
      elements.otRateDeltaBadge.style.color = '#ef4444';
      elements.otRateDeltaBadge.textContent = `-₹${Math.abs(diff)} / hr`;
    } else {
      elements.otRateDeltaBadge.style.display = 'inline-block';
      elements.otRateDeltaBadge.style.background = 'var(--bg-card)';
      elements.otRateDeltaBadge.style.color = 'var(--text-muted)';
      elements.otRateDeltaBadge.textContent = 'No Change';
    }
  }
}

// Auto 3% Increment toggle in promotion mode
if (elements.otPromoAutoIncrementCheck) {
  elements.otPromoAutoIncrementCheck.addEventListener('change', () => {
    const code = elements.otEditEmpCode?.value;
    const emp = appState.otFdeData?.roster?.[code];
    const curBasic = parseFloat(emp?.basicPay || elements.otEditEmpBasicPay?.value) || 0;

    if (elements.otPromoAutoIncrementCheck.checked) {
      const inc3pct = Math.round(curBasic * 0.03);
      const promoNewBasic = Math.ceil((curBasic + inc3pct) / 10) * 10;
      if (elements.otPromoNewBasicPay) elements.otPromoNewBasicPay.value = promoNewBasic;
      if (elements.otPromoIncrementExplainer) {
        elements.otPromoIncrementExplainer.textContent = `Basic ₹${curBasic.toLocaleString('en-IN')} + 3% (₹${inc3pct.toLocaleString('en-IN')}) ➔ New Promoted Basic: ₹${promoNewBasic.toLocaleString('en-IN')}`;
      }
    }
    updateModalCalculatedRate();
  });
}

// Quick promo cadre pills click helper
document.addEventListener('click', (e) => {
  const cadrePill = e.target.closest('.quick-promo-cadre');
  if (cadrePill && elements.otPromoTargetDesignation) {
    e.preventDefault();
    elements.otPromoTargetDesignation.value = cadrePill.getAttribute('data-cadre');
    const code = elements.otEditEmpCode?.value;
    const emp = appState.otFdeData?.roster?.[code];
    if (elements.otPromoRemarks) {
      elements.otPromoRemarks.value = `Promoted from ${emp?.designation || ''} to ${cadrePill.getAttribute('data-cadre')}`;
    }
  }
});

// Modal tab clicks
if (elements.btnTabModalProfile) {
  elements.btnTabModalProfile.addEventListener('click', () => switchEmployeeModalTab('profile'));
}
if (elements.btnTabModalPromotion) {
  elements.btnTabModalPromotion.addEventListener('click', () => switchEmployeeModalTab('promotion'));
}

// Modal inputs live calculation
if (elements.otEditEmpBasicPay) elements.otEditEmpBasicPay.addEventListener('input', updateModalCalculatedRate);
if (elements.otEditEmpDa) elements.otEditEmpDa.addEventListener('input', updateModalCalculatedRate);
if (elements.otPromoNewBasicPay) elements.otPromoNewBasicPay.addEventListener('input', updateModalCalculatedRate);

// Modal close buttons
if (elements.btnCloseEditEmpModal) {
  elements.btnCloseEditEmpModal.addEventListener('click', () => closeModal(elements.otEditEmployeeModal));
}
if (elements.btnCancelEditEmpModal) {
  elements.btnCancelEditEmpModal.addEventListener('click', () => closeModal(elements.otEditEmployeeModal));
}

// Retire or Reactivate Employee Action Listener
if (elements.btnToggleRetireEmployee) {
  elements.btnToggleRetireEmployee.addEventListener('click', async () => {
    const code = elements.otEditEmpCode?.value;
    const emp = appState.otFdeData?.roster?.[code];
    if (!emp) return;

    const isRetired = emp.status === 'retired';
    const targetStatus = isRetired ? 'active' : 'retired';
    const confirmMsg = isRetired
      ? `Reactivate ${emp.name} (${code}) to Active crew roster?`
      : `Mark ${emp.name} (${code}) as Retired / Superannuated from ONGC?\n(Historical OT claim records are preserved)`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/ot-fde/employee/${encodeURIComponent(code)}/retire`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          retirementDate: new Date().toISOString().slice(0, 10),
          retirementRemarks: isRetired ? 'Reactivated to active duty' : 'Superannuated from ONGC SST Section'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        closeModal(elements.otEditEmployeeModal);
        await fetchOtFdeData();
        renderEmployeeRoster();
        updateLiveJobPreview();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update retirement status: ' + err.message, 'error');
    }
  });
}

// Crew deletion is strictly managed from Admin Control Center (/admin.html)
window.confirmDeleteEmployee = function(code) {
  showToast('Crew deletion is restricted to the Administrator Control Center (/admin.html).', 'warning');
};

if (elements.btnDeleteEmployee) {
  elements.btnDeleteEmployee.style.display = 'none';
}

// Submit Edit Employee / Promotion Form
if (elements.otEditEmployeeForm) {
  elements.otEditEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = elements.otEditEmpCode?.value;
    if (!code) return;

    const isPromotion = elements.otModalActiveMode?.value === 'promotion';

    let payload = {};
    if (isPromotion) {
      const designation = elements.otPromoTargetDesignation?.value.trim();
      const basicPay = parseFloat(elements.otPromoNewBasicPay?.value);
      const da = parseFloat(elements.otEditEmpDa?.value) || 0;
      const promotionDate = elements.otPromoDate?.value || new Date().toISOString().slice(0, 10);
      const promotionOrder = elements.otPromoOrderNo?.value.trim();
      const promotionRemarks = elements.otPromoRemarks?.value.trim();

      if (!designation) {
        showToast('Please select or enter the promoted designation', 'warning');
        elements.otPromoTargetDesignation?.focus();
        return;
      }
      if (isNaN(basicPay) || basicPay <= 0) {
        showToast('Please enter a valid promoted basic pay', 'warning');
        elements.otPromoNewBasicPay?.focus();
        return;
      }

      payload = {
        isPromotion: true,
        designation,
        basicPay,
        da,
        promotionDate,
        promotionOrder,
        promotionRemarks
      };
    } else {
      const name = elements.otEditEmpName?.value.trim();
      const cpf = elements.otEditEmpCpf?.value.trim();
      const designation = elements.otEditEmpDesignation?.value.trim();
      const basicPay = parseFloat(elements.otEditEmpBasicPay?.value) || 0;
      const da = parseFloat(elements.otEditEmpDa?.value) || 0;

      if (!name) {
        showToast('Please enter employee name', 'warning');
        elements.otEditEmpName?.focus();
        return;
      }
      if (!cpf) {
        showToast('Please enter CPF number', 'warning');
        elements.otEditEmpCpf?.focus();
        return;
      }
      if (!designation) {
        showToast('Please enter official designation', 'warning');
        elements.otEditEmpDesignation?.focus();
        return;
      }

      payload = {
        name,
        cpf,
        designation,
        basicPay,
        da,
        isPromotion: false
      };
    }

    if (isPromotion && !appState.currentUser?.isAdmin) {
      showToast(`Submitting promotion request for ${code} to Admin for approval...`, 'info');
      try {
        const reqRes = await fetch('/api/admin/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'CREW_PROMOTE',
            employeeCode: code,
            employeeName: payload.name || code,
            cpf: payload.cpf || '',
            payload: {
              newDesignation: payload.designation,
              newBasicPay: payload.basicPay,
              orderNo: payload.promotionOrder,
              remarks: payload.promotionRemarks,
              promotionDate: payload.promotionDate
            },
            requestedBy: appState.currentUser?.name || 'Portal User',
            reason: payload.promotionRemarks || `Promotion to ${payload.designation}`
          })
        });
        const reqData = await reqRes.json();
        if (reqData.success) {
          showToast(`⚡ Promotion request for ${code} submitted! Sent to Admin for approval.`, 'success');
          closeModal(elements.otEditEmployeeModal);
          return;
        } else {
          showToast('Error: ' + reqData.error, 'error');
          return;
        }
      } catch (err) {
        showToast('Failed to submit promotion request: ' + err.message, 'error');
        return;
      }
    }

    try {
      showToast(isPromotion ? `Processing promotion for ${code}...` : `Saving updates for ${code}...`, 'info');
      const res = await fetch(`/api/ot-fde/employee/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        closeModal(elements.otEditEmployeeModal);
        await fetchOtFdeData();
        renderEmployeeRoster();
        updateLiveJobPreview();
        if (typeof renderOtStatement === 'function') {
          renderOtStatement();
        }
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update employee: ' + err.message, 'error');
    }
  });
}

// Add New Employee Modal Logic
function openAddEmployeeModal() {
  if (!elements.otAddEmployeeModal) return;
  elements.otAddEmployeeForm?.reset();
  if (elements.otAddEmpBasicPay) elements.otAddEmpBasicPay.value = 38490;
  if (elements.otAddEmpDa) elements.otAddEmpDa.value = 19091;
  if (elements.otAddEmpSection) elements.otAddEmpSection.value = 'SST';
  if (elements.otAddEmpLocation) elements.otAddEmpLocation.value = 'JORHAT';
  updateAddCalculatedRate();
  openModal(elements.otAddEmployeeModal);
}

function updateAddCalculatedRate() {
  const basic = parseFloat(elements.otAddEmpBasicPay?.value) || 0;
  const da = parseFloat(elements.otAddEmpDa?.value) || 0;
  const rate = Math.floor((basic + da) / 104);
  if (elements.otAddCalculatedRate) {
    elements.otAddCalculatedRate.textContent = `₹${rate} / hr`;
  }
}

if (elements.btnOpenAddEmployeeModal) {
  elements.btnOpenAddEmployeeModal.addEventListener('click', openAddEmployeeModal);
}
if (elements.btnCloseAddEmpModal) {
  elements.btnCloseAddEmpModal.addEventListener('click', () => closeModal(elements.otAddEmployeeModal));
}
if (elements.btnCancelAddEmpModal) {
  elements.btnCancelAddEmpModal.addEventListener('click', () => closeModal(elements.otAddEmployeeModal));
}
if (elements.otAddEmpBasicPay) elements.otAddEmpBasicPay.addEventListener('input', updateAddCalculatedRate);
if (elements.otAddEmpDa) elements.otAddEmpDa.addEventListener('input', updateAddCalculatedRate);

if (elements.otAddEmployeeForm) {
  elements.otAddEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = elements.otAddEmpCode?.value.trim().toUpperCase();
    const name = elements.otAddEmpName?.value.trim().toUpperCase();
    const cpf = elements.otAddEmpCpf?.value.trim();
    const designation = elements.otAddEmpDesignation?.value.trim().toUpperCase();
    const basicPay = parseFloat(elements.otAddEmpBasicPay?.value) || 0;
    const da = parseFloat(elements.otAddEmpDa?.value) || 0;
    const section = elements.otAddEmpSection?.value.trim().toUpperCase() || 'SST';
    const location = elements.otAddEmpLocation?.value.trim().toUpperCase() || 'JORHAT';

    if (!code || !name || !designation) {
      showToast('Please fill in Employee Code, Full Name, and Designation', 'warning');
      return;
    }

    if (!appState.currentUser?.isAdmin) {
      showToast(`Submitting new crew request for ${name} (${code}) to Admin for approval...`, 'info');
      try {
        const reqRes = await fetch('/api/admin/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'CREW_ADD',
            employeeCode: code,
            employeeName: name,
            cpf,
            payload: { code, name, cpf, designation, basicPay, da, section, location },
            requestedBy: appState.currentUser?.name || 'Portal User',
            reason: 'New crew addition requested from portal'
          })
        });
        const reqData = await reqRes.json();
        if (reqData.success) {
          showToast(`⚡ Request Submitted! Addition of ${name} (${code}) sent to Admin for approval.`, 'success');
          closeModal(elements.otAddEmployeeModal);
          return;
        } else {
          showToast('Error: ' + reqData.error, 'error');
          return;
        }
      } catch (err) {
        showToast('Failed to submit crew add request: ' + err.message, 'error');
        return;
      }
    }

    try {
      showToast(`Adding ${name} (${code}) to roster...`, 'info');
      const res = await fetch('/api/ot-fde/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, cpf, designation, basicPay, da, section, location })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        closeModal(elements.otAddEmployeeModal);
        await fetchOtFdeData();
        renderEmployeeRoster();
        updateLiveJobPreview();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to add employee: ' + err.message, 'error');
    }
  });
}

// Roster Filter button handlers
function setRosterFilter(filter) {
  appState.rosterFilter = filter;
  if (elements.btnRosterFilterActive) elements.btnRosterFilterActive.classList.toggle('active', filter === 'active');
  if (elements.btnRosterFilterRetired) elements.btnRosterFilterRetired.classList.toggle('active', filter === 'retired');
  if (elements.btnRosterFilterAll) elements.btnRosterFilterAll.classList.toggle('active', filter === 'all');
  renderEmployeeRoster();
}

if (elements.btnRosterFilterActive) elements.btnRosterFilterActive.addEventListener('click', () => setRosterFilter('active'));
if (elements.btnRosterFilterRetired) elements.btnRosterFilterRetired.addEventListener('click', () => setRosterFilter('retired'));
if (elements.btnRosterFilterAll) elements.btnRosterFilterAll.addEventListener('click', () => setRosterFilter('all'));

// Annual Basic Pay Increment Tool Listener (Yearly % Tool)
if (elements.btnApplyBatchIncrement) {
  elements.btnApplyBatchIncrement.addEventListener('click', async () => {
    const pct = parseFloat(elements.inpBatchIncrementPct?.value);
    if (isNaN(pct) || pct <= 0) {
      showToast('Please enter a valid positive increment percentage (e.g. 3.0)', 'warning');
      return;
    }
    if (!confirm(`Apply annual Basic Pay increment of ${pct}% across ALL 12 crew members?\n(Basic Pay will be rounded to nearest ₹10 as per ONGC rules with auto-recalculated OT rates)`)) return;

    try {
      showToast(`Applying ${pct}% annual increment across all crew members...`, 'info');
      const res = await fetch('/api/ot-fde/roster/batch-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: pct })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        await fetchOtFdeData();
        renderEmployeeRoster();
        updateLiveJobPreview();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to apply increment: ' + err.message, 'error');
    }
  });
}

// 6-Month Dearness Allowance (DA) Revision Tool Listener
if (elements.btnApplyBatchDa) {
  elements.btnApplyBatchDa.addEventListener('click', async () => {
    const type = elements.selBatchDaType?.value || 'amount';
    const val = parseFloat(elements.inpBatchDaValue?.value);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid DA value or percentage', 'warning');
      elements.inpBatchDaValue?.focus();
      return;
    }

    const confirmMsg = type === 'percentage'
      ? `Apply DA rate of ${val}% of Basic Pay across ALL 12 crew members?\nMines Act OT hourly rates will be updated automatically.`
      : `Apply flat Dearness Allowance (DA) of ₹${val} across ALL 12 crew members?\nMines Act OT hourly rates will be updated automatically.`;
    if (!confirm(confirmMsg)) return;

    try {
      showToast('Applying 6-month DA revision to all crew members in 1 click...', 'info');
      const body = type === 'percentage' ? { daPercentage: val } : { daAmount: val };
      const res = await fetch('/api/ot-fde/roster/batch-da', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        await fetchOtFdeData();
        renderEmployeeRoster();
        updateLiveJobPreview();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to update DA: ' + err.message, 'error');
    }
  });
}

// Exports
function exportOtPdf() {
  const empCode = elements.otStatementEmployee?.value || appState.activeOtStatementEmployee || 'UC';
  const month = elements.otStatementMonth?.value || appState.activeOtStatementMonth || '2025-01';
  window.open(`/api/ot-fde/export/pdf?type=OT&empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`, '_blank');
}

function exportOtExcel() {
  const empCode = elements.otStatementEmployee?.value || appState.activeOtStatementEmployee || 'UC';
  const month = elements.otStatementMonth?.value || appState.activeOtStatementMonth || '2025-01';
  window.location.href = `/api/ot-fde/export/excel?type=OT&empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`;
}

function exportFdePdf() {
  const empCode = elements.fdeStatementEmployee?.value || appState.activeFdeStatementEmployee || 'UC';
  const month = elements.fdeStatementMonth?.value || appState.activeFdeStatementMonth || '2025-01';
  window.open(`/api/ot-fde/export/pdf?type=FDE&empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`, '_blank');
}

function exportFdeExcel() {
  const empCode = elements.fdeStatementEmployee?.value || appState.activeFdeStatementEmployee || 'UC';
  const month = elements.fdeStatementMonth?.value || appState.activeFdeStatementMonth || '2025-01';
  window.location.href = `/api/ot-fde/export/excel?type=FDE&empCode=${encodeURIComponent(empCode)}&month=${encodeURIComponent(month)}`;
}

// Event Listeners for Tab 4 Nav and Actions
if (elements.btnSubOtLogJob) elements.btnSubOtLogJob.addEventListener('click', () => switchOtSubTab('logJob'));
if (elements.btnSubOtStatement) elements.btnSubOtStatement.addEventListener('click', () => switchOtSubTab('otStatement'));
if (elements.btnSubFdeStatement) elements.btnSubFdeStatement.addEventListener('click', () => switchOtSubTab('fdeStatement'));
if (elements.btnSubOtAllJobs) elements.btnSubOtAllJobs.addEventListener('click', () => switchOtSubTab('allJobs'));
if (elements.btnSubOtRoster) elements.btnSubOtRoster.addEventListener('click', () => switchOtSubTab('roster'));
if (elements.btnQuickLogJob) elements.btnQuickLogJob.addEventListener('click', () => switchOtSubTab('logJob'));

// Header quick export buttons
if (elements.btnHeaderExportOtPdf) elements.btnHeaderExportOtPdf.addEventListener('click', exportOtPdf);
if (elements.btnHeaderExportFdePdf) elements.btnHeaderExportFdePdf.addEventListener('click', exportFdePdf);

// Statement panel export buttons
if (elements.btnExportOtPdf) elements.btnExportOtPdf.addEventListener('click', exportOtPdf);
if (elements.btnExportOtExcel) elements.btnExportOtExcel.addEventListener('click', exportOtExcel);
if (elements.btnExportFdePdf) elements.btnExportFdePdf.addEventListener('click', exportFdePdf);
if (elements.btnExportFdeExcel) elements.btnExportFdeExcel.addEventListener('click', exportFdeExcel);

// Statement filter changes
if (elements.btnOtPeriodMonth) {
  elements.btnOtPeriodMonth.addEventListener('click', () => setOtPeriodMode('month'));
}
if (elements.btnOtPeriodYear) {
  elements.btnOtPeriodYear.addEventListener('click', () => setOtPeriodMode('year'));
}

function stepOtMonth(direction) {
  const current = (elements.otStatementMonth?.value || appState.activeOtStatementMonth || '2025-01');
  const parts = current.split('-');
  let y = parseInt(parts[0], 10) || 2025;
  let m = parseInt(parts[1], 10) || 1;
  m += direction;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  const nextMonthKey = `${y}-${String(m).padStart(2, '0')}`;
  if (elements.otStatementMonth) {
    elements.otStatementMonth.value = nextMonthKey;
  }
  appState.activeOtStatementMonth = nextMonthKey;
  renderOtStatement();
}

if (elements.btnOtPrevMonth) {
  elements.btnOtPrevMonth.addEventListener('click', () => stepOtMonth(-1));
}
if (elements.btnOtNextMonth) {
  elements.btnOtNextMonth.addEventListener('click', () => stepOtMonth(1));
}

if (elements.otYearSelect) {
  elements.otYearSelect.addEventListener('change', (e) => {
    appState.activeOtYear = e.target.value;
    renderOtYearlySummary();
  });
}

if (elements.otYearCrewFilter) {
  elements.otYearCrewFilter.addEventListener('change', (e) => {
    appState.activeOtYearCrew = e.target.value;
    renderOtYearlySummary();
  });
}

if (elements.btnExportYearlyExcel) {
  elements.btnExportYearlyExcel.addEventListener('click', () => {
    const yr = elements.otYearSelect?.value || appState.activeOtYear || '2025';
    window.location.href = `/api/ot-fde/export/yearly-excel?year=${encodeURIComponent(yr)}`;
  });
}

if (elements.otStatementEmployee) {
  elements.otStatementEmployee.addEventListener('change', (e) => {
    appState.activeOtStatementEmployee = e.target.value;
    renderOtStatement();
  });
}
if (elements.otStatementMonth) {
  elements.otStatementMonth.addEventListener('change', (e) => {
    appState.activeOtStatementMonth = e.target.value;
    renderOtStatement();
  });
}
if (elements.fdeStatementEmployee) {
  elements.fdeStatementEmployee.addEventListener('change', (e) => {
    appState.activeFdeStatementEmployee = e.target.value;
    renderFdeStatement();
  });
}
if (elements.fdeStatementMonth) {
  elements.fdeStatementMonth.addEventListener('change', (e) => {
    appState.activeFdeStatementMonth = e.target.value;
    renderFdeStatement();
  });
}

// All jobs search input
if (elements.otAllJobsSearch) {
  elements.otAllJobsSearch.addEventListener('input', (e) => {
    appState.otAllJobsSearchQuery = e.target.value;
    renderAllJobsTable();
  });
}

// Helper: Day Name
function getDayName(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
}


// ============================================================
// INITIALIZATION
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthStatus();
  switchMainTab(null); // All tabs start in closed system!
  fetchCurrentData();
  fetchWellSites();
  fetchMaintenanceData();
  fetchOtFdeData();
});


