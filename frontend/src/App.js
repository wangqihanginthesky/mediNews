import React, { useState, useEffect, useMemo } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Autocomplete,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  useMediaQuery,
  Collapse,
  Button,
  alpha,
  Breadcrumbs,
  Link,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon,
  LocalHospital as HospitalIcon,
  Business as BusinessIcon,
  Clear as ClearIcon,
  Biotech as BiotechIcon,
  Medication as MedicationIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  OpenInNew as OpenInNewIcon,
  FilterAlt as FilterAltIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  NewReleases as NewReleasesIcon,
} from '@mui/icons-material';
import { DataGrid, jaJP } from '@mui/x-data-grid';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { subMonths, format, parseISO, startOfMonth, isAfter, isBefore, isValid } from 'date-fns';

// カスタムテーマ - 改良版
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#10b981',  // 緑色 - P3終了用
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#3b82f6',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Inter", "Roboto", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    ...Array(19).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

// カラーパレット
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

// イベントタイプの色を動的に取得
const getEventTypeColor = (eventType, index = 0) => {
  // 既知のイベントタイプには特定の色を割り当て
  const colorMap = {
    'P3開始': '#2563eb',
    'P3終了': '#10b981',
    '承認': '#8b5cf6',
    '申請': '#f59e0b',
    'P2開始': '#06b6d4',
    'P2終了': '#84cc16',
    'P1開始': '#ec4899',
    'P1終了': '#f97316',
  };
  return colorMap[eventType] || COLORS[index % COLORS.length];
};

// API Base URL
const API_BASE = '/api';

// フェーズ進捗バーコンポーネント
const PhaseProgressBar = ({ status }) => {
  // ステータスからフェーズレベルを計算
  const getPhaseLevel = (status) => {
    if (!status) return 0;
    if (status.includes('承認') || status === 'Marketed') return 100;
    if (status.includes('申請')) return 90;
    if (status.includes('P3終了') || status === 'Phase 3') return 75;
    if (status.includes('P3開始')) return 60;
    if (status.includes('P2終了') || status === 'Phase 2') return 50;
    if (status.includes('P2開始')) return 40;
    if (status.includes('P1終了') || status === 'Phase 1') return 30;
    if (status.includes('P1開始')) return 20;
    if (status === 'Phase 4') return 100;
    return 10;
  };

  const level = getPhaseLevel(status);

  // グラデーションカラー
  const getGradient = (level) => {
    if (level >= 90) return 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)';
    if (level >= 60) return 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)';
    if (level >= 40) return 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)';
    return 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <Box
        sx={{
          flex: 1,
          height: 8,
          bgcolor: '#e2e8f0',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${level}%`,
            height: '100%',
            background: getGradient(level),
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
};

// 統計カードコンポーネント - クリック可能版
const StatCard = ({ title, value, icon, color, subtitle, isActive, onClick, clickable = false }) => (
  <Card
    sx={{
      height: '100%',
      cursor: clickable ? 'pointer' : 'default',
      border: isActive ? `2px solid ${color}` : '1px solid #e2e8f0',
      bgcolor: isActive ? alpha(color, 0.04) : 'background.paper',
      transition: 'all 0.2s ease-in-out',
      '&:hover': clickable ? {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px -8px ${alpha(color, 0.25)}`,
        borderColor: color,
      } : {},
    }}
    onClick={clickable ? onClick : undefined}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ fontWeight: 500, mb: 0.5, fontSize: '0.8rem' }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 700, color, lineHeight: 1.2 }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha(color, 0.1),
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
      {clickable && (
        <Typography
          variant="caption"
          sx={{
            mt: 1.5,
            display: 'block',
            color: isActive ? color : 'text.secondary',
            fontWeight: isActive ? 600 : 400,
          }}
        >
          {isActive ? '✓ フィルター中' : 'クリックでフィルター'}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// 薬品カードコンポーネント - 改良版
const DrugCard = ({ drug }) => {
  const statusColor = getEventTypeColor(drug.event_type);
  const isStartType = drug.event_type?.includes('開始');
  const StatusIcon = isStartType ? PlayArrowIcon : CheckCircleIcon;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)',
          borderColor: statusColor,
          '& .view-detail-hint': {
            opacity: 1,
          },
        },
        // 左側のステータスストライプ
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: statusColor,
          borderRadius: '12px 0 0 12px',
        },
      }}
    >
      <CardActionArea
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        href={drug.url || undefined}
        target="_blank"
      >
        <CardContent sx={{ flexGrow: 1, pl: 2.5 }}>
          {/* ステータスタグ - 右上 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Chip
              label={drug.disease_area || 'その他'}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: '#e2e8f0',
                color: 'text.secondary',
              }}
            />
            <Chip
              icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
              label={drug.event_type}
              size="small"
              sx={{
                bgcolor: alpha(statusColor, 0.1),
                color: statusColor,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 26,
                '& .MuiChip-icon': {
                  color: statusColor,
                },
              }}
            />
          </Box>

          {/* 薬品名 */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: '1.1rem',
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {drug.drug_name || drug.common_name || drug.title}
          </Typography>

          {/* 一般名 */}
          {drug.drug_name && drug.common_name && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.85rem',
                mb: 2,
              }}
            >
              ({drug.common_name})
            </Typography>
          )}

          {/* 会社名 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {drug.company || drug.source}
            </Typography>
          </Box>

          {/* 適応症 */}
          {drug.indication && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <HospitalIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.3 }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}
              >
                {drug.indication}
              </Typography>
            </Box>
          )}

          {/* 日時 */}
          {drug.datetime && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1.5,
                color: 'text.secondary',
              }}
            >
              {drug.datetime}
            </Typography>
          )}

          {/* 詳細表示ヒント */}
          <Box
            className="view-detail-hint"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              mt: 2,
              opacity: 0,
              transition: 'opacity 0.2s',
              color: statusColor,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              詳細を見る
            </Typography>
            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// メインアプリケーション
function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilters, setEventTypeFilters] = useState([]); // 多選
  const [diseaseAreaFilters, setDiseaseAreaFilters] = useState([]); // 多選 - 疾患領域（第1階層）
  const [diseaseCategoryFilters, setDiseaseCategoryFilters] = useState([]); // 多選 - 疾患カテゴリ（第2階層）
  const [diseaseSubcategoryFilters, setDiseaseSubcategoryFilters] = useState([]); // 多選 - 疾患サブカテゴリ（第3階層）
  const [companyFilters, setCompanyFilters] = useState([]); // 多選
  const [drugKeyFilters, setDrugKeyFilters] = useState([]); // 多選 - 一般名/製品名（組み合わせキー）フィルター
  const [startDate, setStartDate] = useState(() => subMonths(new Date(), 1)); // デフォルト：1ヶ月前から
  const [endDate, setEndDate] = useState(new Date()); // デフォルト：今日まで
  const [tabValue, setTabValue] = useState(0);
  const [showFilters, setShowFilters] = useState(true);

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 日付文字列をDateオブジェクトに変換するヘルパー関数
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      // 様々な日付フォーマットに対応
      const date = new Date(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  // APIからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/data`);

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        setData(result.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('データの読み込みに失敗しました。サーバーが起動しているか確認してください。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // データリフレッシュ
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetch(`${API_BASE}/refresh`, { method: 'POST' });

      const response = await fetch(`${API_BASE}/data`);
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // 全データからの統計（フィルター前）
  const totalStats = useMemo(() => {
    const byEventType = {};
    data.forEach(item => {
      byEventType[item.event_type] = (byEventType[item.event_type] || 0) + 1;
    });
    return { byEventType };
  }, [data]);

  // 日付範囲でフィルタされたデータ
  const dateFilteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = parseDate(item.datetime);
      return !itemDate || (
        (!startDate || isAfter(itemDate, startDate) || itemDate.toDateString() === startDate.toDateString()) &&
        (!endDate || isBefore(itemDate, endDate) || itemDate.toDateString() === endDate.toDateString())
      );
    });
  }, [data, startDate, endDate]);

  // フィルター選択肢を計算（日付範囲内のデータから取得）
  // 疾患フィルターは級聯（カスケード）形式：area → category → subcategory
  const filterOptions = useMemo(() => {
    const eventTypes = [...new Set(dateFilteredData.map(d => d.event_type))].filter(Boolean).sort();
    const companies = [...new Set(dateFilteredData.map(d => d.company))].filter(Boolean).sort();

    // 疾患領域（第1階層）- 常に全データから取得
    const diseaseAreas = [...new Set(dateFilteredData.map(d => d.disease_area))].filter(Boolean).sort();

    // 疾患カテゴリ（第2階層）- 選択された疾患領域に基づいてフィルタリング
    const filteredByArea = diseaseAreaFilters.length === 0
      ? dateFilteredData
      : dateFilteredData.filter(d => diseaseAreaFilters.includes(d.disease_area));
    const diseaseCategories = [...new Set(filteredByArea.map(d => d.disease_category))].filter(Boolean).sort();

    // 疾患サブカテゴリ（第3階層）- 選択された疾患カテゴリに基づいてフィルタリング
    const filteredByCategory = diseaseCategoryFilters.length === 0
      ? filteredByArea
      : filteredByArea.filter(d => diseaseCategoryFilters.includes(d.disease_category));
    const diseaseSubcategories = [...new Set(filteredByCategory.map(d => d.disease_subcategory))].filter(Boolean).sort();

    return { eventTypes, diseaseAreas, diseaseCategories, diseaseSubcategories, companies };
  }, [dateFilteredData, diseaseAreaFilters, diseaseCategoryFilters]);

  // 一般名/製品名組み合わせキーを生成するヘルパー関数
  const getDrugKey = (commonName, drugName) => {
    const cn = commonName || '';
    const dn = drugName || '';
    if (cn && dn) return `${cn} / ${dn}`;
    return cn || dn || '';
  };

  // 一般名/製品名フィルターの選択肢（他のフィルター条件を適用した後のデータから取得）
  const drugKeyOptions = useMemo(() => {
    // 組み合わせキー以外のフィルターを適用したデータ
    const preFilteredData = data.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.drug_name && item.drug_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.common_name && item.common_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.indication && item.indication.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.company && item.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesEventType = eventTypeFilters.length === 0 || eventTypeFilters.includes(item.event_type);
      const matchesDiseaseArea = diseaseAreaFilters.length === 0 || diseaseAreaFilters.includes(item.disease_area);
      const matchesDiseaseCategory = diseaseCategoryFilters.length === 0 || diseaseCategoryFilters.includes(item.disease_category);
      const matchesDiseaseSubcategory = diseaseSubcategoryFilters.length === 0 || diseaseSubcategoryFilters.includes(item.disease_subcategory);
      const matchesCompany = companyFilters.length === 0 || companyFilters.includes(item.company);

      // 日付フィルタリング
      const itemDate = parseDate(item.datetime);
      const matchesDateRange = !itemDate || (
        (!startDate || isAfter(itemDate, startDate) || itemDate.toDateString() === startDate.toDateString()) &&
        (!endDate || isBefore(itemDate, endDate) || itemDate.toDateString() === endDate.toDateString())
      );

      return matchesSearch && matchesEventType && matchesDiseaseArea && matchesDiseaseCategory && matchesDiseaseSubcategory && matchesCompany && matchesDateRange;
    });

    // 一般名/製品名の組み合わせキーを生成
    const keys = new Set();
    preFilteredData.forEach(d => {
      const key = getDrugKey(d.common_name, d.drug_name);
      if (key) keys.add(key);
    });
    return [...keys].sort();
  }, [data, searchQuery, eventTypeFilters, diseaseAreaFilters, diseaseCategoryFilters, diseaseSubcategoryFilters, companyFilters, startDate, endDate]);

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.drug_name && item.drug_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.common_name && item.common_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.indication && item.indication.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.company && item.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesEventType = eventTypeFilters.length === 0 || eventTypeFilters.includes(item.event_type);
      const matchesDiseaseArea = diseaseAreaFilters.length === 0 || diseaseAreaFilters.includes(item.disease_area);
      const matchesDiseaseCategory = diseaseCategoryFilters.length === 0 || diseaseCategoryFilters.includes(item.disease_category);
      const matchesDiseaseSubcategory = diseaseSubcategoryFilters.length === 0 || diseaseSubcategoryFilters.includes(item.disease_subcategory);
      const matchesCompany = companyFilters.length === 0 || companyFilters.includes(item.company);

      // 一般名/製品名組み合わせキーでフィルタリング
      const itemDrugKey = getDrugKey(item.common_name, item.drug_name);
      const matchesDrugKey = drugKeyFilters.length === 0 || drugKeyFilters.includes(itemDrugKey);

      // 日付フィルタリング
      const itemDate = parseDate(item.datetime);
      const matchesDateRange = !itemDate || (
        (!startDate || isAfter(itemDate, startDate) || itemDate.toDateString() === startDate.toDateString()) &&
        (!endDate || isBefore(itemDate, endDate) || itemDate.toDateString() === endDate.toDateString())
      );

      return matchesSearch && matchesEventType && matchesDiseaseArea && matchesDiseaseCategory && matchesDiseaseSubcategory && matchesCompany && matchesDrugKey && matchesDateRange;
    });
  }, [data, searchQuery, eventTypeFilters, diseaseAreaFilters, diseaseCategoryFilters, diseaseSubcategoryFilters, companyFilters, drugKeyFilters, startDate, endDate]);

  // 最近の更新データ（直近7日間）
  const recentUpdates = useMemo(() => {
    const sevenDaysAgo = subMonths(new Date(), 0.25); // 約7日前
    return data
      .filter(item => {
        const itemDate = parseDate(item.datetime);
        return itemDate && isAfter(itemDate, sevenDaysAgo);
      })
      .slice(0, 5); // 最新5件
  }, [data]);

  // 統計データ
  const stats = useMemo(() => {
    const byEventType = {};
    const byDiseaseArea = {};
    const byCompany = {};
    const byDrugName = {};
    const byMonth = {};

    // 全イベントタイプを収集
    const allEventTypes = new Set();

    const byDiseaseCategory = {};
    const byDiseaseSubcategory = {};

    filteredData.forEach(item => {
      if (item.event_type) allEventTypes.add(item.event_type);
      byEventType[item.event_type] = (byEventType[item.event_type] || 0) + 1;
      const area = item.disease_area || 'その他';
      byDiseaseArea[area] = (byDiseaseArea[area] || 0) + 1;
      // 疾患カテゴリ集計
      if (item.disease_category) {
        byDiseaseCategory[item.disease_category] = (byDiseaseCategory[item.disease_category] || 0) + 1;
      }
      // 疾患サブカテゴリ集計
      if (item.disease_subcategory) {
        byDiseaseSubcategory[item.disease_subcategory] = (byDiseaseSubcategory[item.disease_subcategory] || 0) + 1;
      }
      byCompany[item.company] = (byCompany[item.company] || 0) + 1;
      if (item.drug_name) {
        byDrugName[item.drug_name] = (byDrugName[item.drug_name] || 0) + 1;
      }

      // 月別集計
      const itemDate = parseDate(item.datetime);
      if (itemDate) {
        const monthKey = format(startOfMonth(itemDate), 'yyyy-MM');
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { total: 0 };
        }
        byMonth[monthKey][item.event_type] = (byMonth[monthKey][item.event_type] || 0) + 1;
        byMonth[monthKey].total += 1;
      }
    });

    const diseaseChartData = Object.entries(byDiseaseArea)
      .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const diseaseCategoryChartData = Object.entries(byDiseaseCategory)
      .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const diseaseSubcategoryChartData = Object.entries(byDiseaseSubcategory)
      .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const companyChartData = Object.entries(byCompany)
      .map(([name, value]) => ({ name: name.length > 10 ? name.substring(0, 10) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const drugNameChartData = Object.entries(byDrugName)
      .map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 12) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // イベントタイプ別チャートデータ（1%未満は「その他」にまとめる）
    const total = filteredData.length;
    const threshold = total * 0.01; // 1%
    const mainEventTypes = [];
    const otherEventTypes = [];
    let otherTotal = 0;

    Object.entries(byEventType).forEach(([name, value]) => {
      if (value >= threshold) {
        mainEventTypes.push({ name, value });
      } else {
        otherEventTypes.push({ name, value });
        otherTotal += value;
      }
    });

    // メインのイベントタイプをソート
    mainEventTypes.sort((a, b) => b.value - a.value);

    // 「その他」があれば追加
    const eventTypeChartData = [...mainEventTypes];
    if (otherTotal > 0) {
      eventTypeChartData.push({
        name: 'その他',
        value: otherTotal,
        isOther: true,
        details: otherEventTypes.sort((a, b) => b.value - a.value),
      });
    }

    // イベントタイプのリスト（ソート済み）
    const eventTypeList = [...allEventTypes].sort();

    // 時系列データ（月別）- 動的にすべてのイベントタイプを含む
    const timelineData = Object.entries(byMonth)
      .map(([month, counts]) => {
        const entry = {
          month,
          monthLabel: format(new Date(month + '-01'), 'yyyy年M月'),
          total: counts.total,
        };
        // すべてのイベントタイプを追加
        eventTypeList.forEach(et => {
          entry[et] = counts[et] || 0;
        });
        return entry;
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // 一般名/製品名組み合わせキー別タイムライン（各薬品のイベント履歴）
    const drugKeyTimeline = {};
    filteredData.forEach(item => {
      const key = getDrugKey(item.common_name, item.drug_name);
      if (!key) return;
      if (!drugKeyTimeline[key]) {
        drugKeyTimeline[key] = {
          key: key,
          commonName: item.common_name,
          drugName: item.drug_name,
          company: item.company,
          events: [],
        };
      }
      const itemDate = parseDate(item.datetime);
      drugKeyTimeline[key].events.push({
        date: item.datetime,
        dateObj: itemDate,
        eventType: item.event_type,
        indication: item.indication,
      });
    });

    // 組み合わせキー別タイムラインデータ
    const drugKeyTimelineData = Object.values(drugKeyTimeline)
      .map(drug => ({
        ...drug,
        events: drug.events.sort((a, b) => {
          if (!a.dateObj || !b.dateObj) return 0;
          return a.dateObj - b.dateObj;
        }),
        eventCount: drug.events.length,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 15); // Top 15

    // 薬品別に集計（unique key = common_name & drug_name / company）
    // Step 1: filteredDataから表示すべき薬品のキーを取得
    const visibleDrugKeys = new Set();
    filteredData.forEach(item => {
      const cn = item.common_name || '';
      const dn = item.drug_name || '';
      const comp = item.company || '';
      if (!cn && !dn) return;
      visibleDrugKeys.add(`${cn}|${dn}|${comp}`);
    });

    // Step 2: 全データから、表示対象の薬品の全ステータス履歴を集計
    // 適応症-ステータス履歴は1対1の関係（各ステータスごとに適応症を記録）
    const drugAggregation = {};
    data.forEach(item => {
      const cn = item.common_name || '';
      const dn = item.drug_name || '';
      const comp = item.company || '';
      const drugKey = `${cn}|${dn}|${comp}`;
      if (!cn && !dn) return;

      // この薬品が表示対象でない場合はスキップ
      if (!visibleDrugKeys.has(drugKey)) return;

      const itemDate = parseDate(item.datetime);

      if (!drugAggregation[drugKey]) {
        drugAggregation[drugKey] = {
          commonName: cn,
          drugName: dn,
          company: comp,
          drugFunction: item.drug_function || '',
          diseaseArea: item.disease_area || '',
          diseaseCategory: item.disease_category || '',
          diseaseSubcategory: item.disease_subcategory || '',
          // ステータス履歴（ステータス+適応症の組み合わせをキーとして使用）
          // キー: "status|indication" でユニーク化
          statusIndicationMap: new Map(),
          latestUpdate: null,
          latestUpdateStr: '',
        };
      }

      // disease_area, diseaseCategory, diseaseSubcategory, drugFunctionがある場合は更新（空でない値を優先）
      if (item.disease_area && !drugAggregation[drugKey].diseaseArea) {
        drugAggregation[drugKey].diseaseArea = item.disease_area;
      }
      if (item.disease_category && !drugAggregation[drugKey].diseaseCategory) {
        drugAggregation[drugKey].diseaseCategory = item.disease_category;
      }
      if (item.disease_subcategory && !drugAggregation[drugKey].diseaseSubcategory) {
        drugAggregation[drugKey].diseaseSubcategory = item.disease_subcategory;
      }
      if (item.drug_function && !drugAggregation[drugKey].drugFunction) {
        drugAggregation[drugKey].drugFunction = item.drug_function;
      }

      // ステータス履歴を追加（ステータス+適応症の組み合わせでユニーク化）
      const status = item.event_type;
      const indication = item.indication || '';
      if (status) {
        // ステータスと適応症の組み合わせをキーとする
        const statusIndicationKey = `${status}|${indication}`;
        const existing = drugAggregation[drugKey].statusIndicationMap.get(statusIndicationKey);
        // 同じステータス+適応症の組み合わせがある場合は最新の日付で更新
        if (!existing || (itemDate && existing.date && itemDate > existing.date)) {
          drugAggregation[drugKey].statusIndicationMap.set(statusIndicationKey, {
            status,
            indication,
            date: itemDate,
            datetime: item.datetime,
          });
        }
      }

      // 最新更新日を追跡（filteredData範囲内のみ）
      // filteredDataに含まれるかチェック
      const isInFilteredRange = filteredData.some(fd =>
        fd.common_name === cn && fd.drug_name === dn && fd.company === comp && fd.datetime === item.datetime
      );
      if (isInFilteredRange && itemDate && (!drugAggregation[drugKey].latestUpdate || itemDate > drugAggregation[drugKey].latestUpdate)) {
        drugAggregation[drugKey].latestUpdate = itemDate;
        drugAggregation[drugKey].latestUpdateStr = item.datetime;
      }
    });

    // 配列に変換してソート
    const aggregatedDrugData = Object.values(drugAggregation)
      .map(drug => ({
        commonName: drug.commonName,
        drugName: drug.drugName,
        company: drug.company,
        drugFunction: drug.drugFunction,
        diseaseArea: drug.diseaseArea,
        diseaseCategory: drug.diseaseCategory,
        diseaseSubcategory: drug.diseaseSubcategory,
        latestUpdate: drug.latestUpdate,
        latestUpdateStr: drug.latestUpdateStr,
        // MapをArrayに変換し、日付順（古い順）にソート
        // 各エントリにはstatus, indication, date, datetimeが含まれる
        statusHistory: Array.from(drug.statusIndicationMap.values()).sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return a.date - b.date;
        }),
      }))
      .sort((a, b) => {
        if (!a.latestUpdate || !b.latestUpdate) return 0;
        return b.latestUpdate - a.latestUpdate;
      });

    return { byEventType, diseaseChartData, diseaseCategoryChartData, diseaseSubcategoryChartData, companyChartData, drugNameChartData, eventTypeChartData, timelineData, eventTypeList, drugKeyTimelineData, aggregatedDrugData };
  }, [filteredData, data]);

  const clearFilters = () => {
    setSearchQuery('');
    setEventTypeFilters([]);
    setDiseaseAreaFilters([]);
    setDiseaseCategoryFilters([]);
    setDiseaseSubcategoryFilters([]);
    setCompanyFilters([]);
    setDrugKeyFilters([]);
    setStartDate(subMonths(new Date(), 1));
    setEndDate(new Date());
  };

  // 疾患領域が変更されたら、カテゴリとサブカテゴリをクリア
  const handleDiseaseAreaChange = (value) => {
    setDiseaseAreaFilters(value);
    setDiseaseCategoryFilters([]);
    setDiseaseSubcategoryFilters([]);
  };

  // 疾患カテゴリが変更されたら、サブカテゴリをクリア
  const handleDiseaseCategoryChange = (value) => {
    setDiseaseCategoryFilters(value);
    setDiseaseSubcategoryFilters([]);
  };

  // 日付が変更されたかどうか
  const defaultStartDate = subMonths(new Date(), 1);
  const isDateModified = startDate?.toDateString() !== defaultStartDate.toDateString() ||
    endDate?.toDateString() !== new Date().toDateString();

  const hasActiveFilters = searchQuery ||
    eventTypeFilters.length > 0 ||
    diseaseAreaFilters.length > 0 ||
    diseaseCategoryFilters.length > 0 ||
    diseaseSubcategoryFilters.length > 0 ||
    companyFilters.length > 0 ||
    drugKeyFilters.length > 0 ||
    isDateModified;

  // カード型クイックフィルター（多選対応）
  const handleStatCardClick = (eventType) => {
    setEventTypeFilters(prev => {
      if (prev.includes(eventType)) {
        return prev.filter(t => t !== eventType); // 解除
      } else {
        return [...prev, eventType]; // 追加
      }
    });
  };

  // DataGrid カラム定義 - Medical
  const medicalColumns = [
    {
      field: 'event_type',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params) => {
        const color = getEventTypeColor(params.value);
        const isStartType = params.value?.includes('開始');
        const Icon = isStartType ? PlayArrowIcon : CheckCircleIcon;
        return (
          <Chip
            icon={<Icon sx={{ fontSize: '14px !important' }} />}
            label={params.value}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 600,
              '& .MuiChip-icon': { color },
            }}
          />
        );
      },
    },
    {
      field: 'drug_name',
      headerName: '製品名',
      width: 140,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'common_name',
      headerName: '一般名',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'company',
      headerName: '企業名',
      width: 180,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'disease_area',
      headerName: '疾患領域',
      width: 180,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'indication',
      headerName: '適応症',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value}
          </Box>
        </Tooltip>
      ),
    },
    { field: 'datetime', headerName: '日時', width: 120 },
  ];

  const columns = medicalColumns;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Box sx={{ flexGrow: 1 }}>
          {/* ヘッダー - 改良版 */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: 'white',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
              {/* ロゴエリア */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BiotechIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      lineHeight: 1.2,
                    }}
                  >
                    MediLine
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Drug Pipeline Tracker
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              {/* リフレッシュボタン */}
              <Tooltip title="データを更新">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>

              {/* データサマリー */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, ml: 2 }}>
                <Chip
                  icon={<MedicationIcon />}
                  label={`${data.length} パイプライン`}
                  variant="outlined"
                  sx={{ borderColor: '#e2e8f0' }}
                />
                <Chip
                  icon={<BusinessIcon />}
                  label={`${new Set(data.map(d => d.company)).size} 企業`}
                  variant="outlined"
                  sx={{ borderColor: '#e2e8f0' }}
                />
              </Box>
            </Toolbar>

            {/* パンくずリスト */}
            <Box sx={{ px: 3, pb: 1.5, bgcolor: '#f8fafc' }}>
              <Breadcrumbs sx={{ fontSize: '0.85rem' }}>
                <Link
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', cursor: 'pointer' }}
                  onClick={clearFilters}
                >
                  <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  ホーム
                </Link>
                <Typography color="text.primary" sx={{ fontWeight: 500 }}>
                  検索結果
                </Typography>
                {hasActiveFilters && (
                  <Typography color="primary" sx={{ fontWeight: 600 }}>
                    {filteredData.length}件
                  </Typography>
                )}
              </Breadcrumbs>
            </Box>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* ローディング表示 */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress size={60} />
              </Box>
            )}

            {/* エラー表示 */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* メインコンテンツ（ローディング完了後） */}
            {!loading && !error && (
              <>
                {/* 最新の更新セクション */}
                {recentUpdates.length > 0 && !hasActiveFilters && (
                  <Paper
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid #e2e8f0',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <NewReleasesIcon sx={{ color: '#f59e0b' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        最新の更新
                      </Typography>
                      <Chip
                        label={`直近${recentUpdates.length}件`}
                        size="small"
                        sx={{ ml: 1, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}
                      />
                    </Box>
                    <Grid container spacing={2}>
                      {recentUpdates.map((item, index) => {
                        const statusColor = getEventTypeColor(item.event_type, index);
                        return (
                          <Grid item xs={12} sm={6} md={4} lg={2.4} key={item.id || index}>
                            <Card
                              sx={{
                                height: '100%',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  borderColor: statusColor,
                                },
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: 3,
                                  backgroundColor: statusColor,
                                  borderRadius: '4px 0 0 4px',
                                },
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <CardActionArea href={item.url || undefined} target="_blank" sx={{ height: '100%' }}>
                                <CardContent sx={{ p: 1.5, pl: 2 }}>
                                  <Chip
                                    label={item.event_type}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      bgcolor: alpha(statusColor, 0.1),
                                      color: statusColor,
                                      mb: 0.5,
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.85rem',
                                      lineHeight: 1.3,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {item.drug_name || item.common_name || item.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                                    {item.company}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 12 }} />
                                    {item.datetime}
                                  </Typography>
                                </CardContent>
                              </CardActionArea>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>
                )}

                {/* 検索とフィルター - コンパクト版 */}
                <Paper
                  sx={{
                    p: 2.5,
                    mb: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="薬品名、企業名、適応症で検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearchQuery('')}>
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        flexGrow: 1,
                        minWidth: 280,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                    <Button
                      variant={showFilters ? "contained" : "outlined"}
                      startIcon={<FilterAltIcon />}
                      onClick={() => setShowFilters(!showFilters)}
                      size="medium"
                      sx={{
                        minWidth: 120,
                        ...(showFilters && {
                          bgcolor: 'primary.main',
                        }),
                      }}
                    >
                      フィルター
                    </Button>
                  </Box>

                  <Collapse in={showFilters}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                      <Grid container spacing={2} sx={{ mt: 2 }}>
                        {/* 期間フィルター */}
                        <Grid item xs={6} md={2}>
                          <DatePicker
                            label="開始日"
                            value={startDate}
                            onChange={(newValue) => setStartDate(newValue)}
                            slotProps={{
                              textField: {
                                size: 'small',
                                fullWidth: true,
                                InputProps: {
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    </InputAdornment>
                                  ),
                                },
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <DatePicker
                            label="終了日"
                            value={endDate}
                            onChange={(newValue) => setEndDate(newValue)}
                            slotProps={{
                              textField: {
                                size: 'small',
                                fullWidth: true,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2.5}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={filterOptions.eventTypes}
                            value={eventTypeFilters}
                            onChange={(e, value) => setEventTypeFilters(value)}
                            renderInput={(params) => <TextField {...params} label="ステータス" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => {
                                const color = getEventTypeColor(option, index);
                                return (
                                  <Chip
                                    {...getTagProps({ index })}
                                    key={option}
                                    label={option}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(color, 0.1),
                                      color: color,
                                    }}
                                  />
                                );
                              })
                            }
                          />
                        </Grid>
                        {/* 疾患フィルター - 級聯（カスケード）形式 */}
                        <Grid item xs={12} md={2}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={filterOptions.diseaseAreas}
                            value={diseaseAreaFilters}
                            onChange={(e, value) => handleDiseaseAreaChange(value)}
                            renderInput={(params) => <TextField {...params} label="疾患領域" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option}
                                  label={option}
                                  size="small"
                                  sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6' }}
                                />
                              ))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={filterOptions.diseaseCategories}
                            value={diseaseCategoryFilters}
                            onChange={(e, value) => handleDiseaseCategoryChange(value)}
                            disabled={filterOptions.diseaseCategories.length === 0}
                            renderInput={(params) => <TextField {...params} label="疾患カテゴリ" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option}
                                  label={option}
                                  size="small"
                                  sx={{ bgcolor: alpha('#a855f7', 0.1), color: '#a855f7' }}
                                />
                              ))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={filterOptions.diseaseSubcategories}
                            value={diseaseSubcategoryFilters}
                            onChange={(e, value) => setDiseaseSubcategoryFilters(value)}
                            disabled={filterOptions.diseaseSubcategories.length === 0}
                            renderInput={(params) => <TextField {...params} label="疾患詳細" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option}
                                  label={option}
                                  size="small"
                                  sx={{ bgcolor: alpha('#c084fc', 0.1), color: '#c084fc' }}
                                />
                              ))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={filterOptions.companies}
                            value={companyFilters}
                            onChange={(e, value) => setCompanyFilters(value)}
                            renderInput={(params) => <TextField {...params} label="企業名" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option}
                                  label={option}
                                  size="small"
                                  sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}
                                />
                              ))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Autocomplete
                            multiple
                            size="small"
                            options={drugKeyOptions}
                            value={drugKeyFilters}
                            onChange={(e, value) => setDrugKeyFilters(value)}
                            renderInput={(params) => <TextField {...params} label="一般名/製品名" placeholder="選択..." />}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option}
                                  label={option}
                                  size="small"
                                  sx={{ bgcolor: alpha('#ec4899', 0.1), color: '#ec4899' }}
                                />
                              ))
                            }
                          />
                        </Grid>
                      </Grid>
                    </LocalizationProvider>
                  </Collapse>

                  {/* アクティブフィルター表示 */}
                  {hasActiveFilters && (
                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        適用中:
                      </Typography>
                      {searchQuery && (
                        <Chip
                          label={`検索: ${searchQuery}`}
                          size="small"
                          onDelete={() => setSearchQuery('')}
                          sx={{ bgcolor: alpha('#2563eb', 0.1), color: '#2563eb' }}
                        />
                      )}
                      {eventTypeFilters.map((filter, idx) => {
                        const color = getEventTypeColor(filter, idx);
                        return (
                          <Chip
                            key={filter}
                            label={filter}
                            size="small"
                            onDelete={() => setEventTypeFilters(prev => prev.filter(f => f !== filter))}
                            sx={{
                              bgcolor: alpha(color, 0.1),
                              color: color,
                            }}
                          />
                        );
                      })}
                      {diseaseAreaFilters.map(filter => (
                        <Chip
                          key={`area-${filter}`}
                          label={`領域: ${filter}`}
                          size="small"
                          onDelete={() => handleDiseaseAreaChange(diseaseAreaFilters.filter(f => f !== filter))}
                          sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6' }}
                        />
                      ))}
                      {diseaseCategoryFilters.map(filter => (
                        <Chip
                          key={`cat-${filter}`}
                          label={`カテゴリ: ${filter}`}
                          size="small"
                          onDelete={() => handleDiseaseCategoryChange(diseaseCategoryFilters.filter(f => f !== filter))}
                          sx={{ bgcolor: alpha('#a855f7', 0.1), color: '#a855f7' }}
                        />
                      ))}
                      {diseaseSubcategoryFilters.map(filter => (
                        <Chip
                          key={`subcat-${filter}`}
                          label={`詳細: ${filter}`}
                          size="small"
                          onDelete={() => setDiseaseSubcategoryFilters(prev => prev.filter(f => f !== filter))}
                          sx={{ bgcolor: alpha('#c084fc', 0.1), color: '#c084fc' }}
                        />
                      ))}
                      {companyFilters.map(filter => (
                        <Chip
                          key={filter}
                          label={filter}
                          size="small"
                          onDelete={() => setCompanyFilters(prev => prev.filter(f => f !== filter))}
                          sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}
                        />
                      ))}
                      {drugKeyFilters.map(filter => (
                        <Chip
                          key={filter}
                          label={filter}
                          size="small"
                          onDelete={() => setDrugKeyFilters(prev => prev.filter(f => f !== filter))}
                          sx={{ bgcolor: alpha('#ec4899', 0.1), color: '#ec4899' }}
                        />
                      ))}
                      <Button
                        size="small"
                        onClick={clearFilters}
                        sx={{
                          ml: 'auto',
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        すべてクリア
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* タブコンテンツ */}
                <Paper sx={{ border: '1px solid #e2e8f0' }}>
                  <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      px: 2,
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Tab icon={<BiotechIcon />} label="薬品一覧" iconPosition="start" />
                    <Tab icon={<ChartIcon />} label="統計グラフ" iconPosition="start" />
                  </Tabs>

                  <Box sx={{ p: 3 }}>
                    {/* 結果サマリー */}
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong style={{ color: '#1e293b' }}>{filteredData.length}</strong> 件の結果
                      </Typography>
                    </Box>

                    {/* 薬品一覧（聚合ビュー） */}
                    {tabValue === 0 && (
                      <Box sx={{ overflowX: 'auto' }}>
                        {/* テーブルヘッダー */}
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '180px 100px 100px 100px 80px 1fr 80px',
                            gap: 1,
                            px: 1.5,
                            py: 1,
                            bgcolor: '#f8fafc',
                            borderBottom: '2px solid #e2e8f0',
                            fontWeight: 600,
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            minWidth: 900,
                          }}
                        >
                          <Box>一般名 & 製品名 / 企業名</Box>
                          <Box>疾患領域</Box>
                          <Box>疾患カテゴリ</Box>
                          <Box>疾患詳細</Box>
                          <Box>薬効分類</Box>
                          <Box>適応症 - ステータス履歴</Box>
                          <Box>更新日</Box>
                        </Box>

                        {/* テーブルボディ */}
                        {stats.aggregatedDrugData.map((drug, drugIndex) => (
                          <Box
                            key={`${drug.commonName}-${drug.drugName}-${drug.company}-${drugIndex}`}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '180px 100px 100px 100px 80px 1fr 80px',
                              gap: 1,
                              px: 1.5,
                              py: 1,
                              alignItems: 'flex-start',
                              borderBottom: '1px solid #f1f5f9',
                              minWidth: 900,
                              '&:hover': {
                                bgcolor: '#fafbfc',
                              },
                            }}
                          >
                            {/* 一般名 & 製品名 / 企業名 */}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: '#0ea5e9',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                  fontSize: '0.8rem',
                                }}
                              >
                                {drug.commonName || '-'}
                              </Typography>
                              {drug.drugName && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: '#06b6d4',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {drug.drugName}
                                </Typography>
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  display: 'block',
                                  wordBreak: 'break-word',
                                  fontSize: '0.7rem',
                                }}
                              >
                                {drug.company}
                              </Typography>
                            </Box>

                            {/* 疾患領域 */}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.primary',
                                  fontSize: '0.75rem',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                }}
                              >
                                {drug.diseaseArea || '-'}
                              </Typography>
                            </Box>

                            {/* 疾患カテゴリ */}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.primary',
                                  fontSize: '0.75rem',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                }}
                              >
                                {drug.diseaseCategory || '-'}
                              </Typography>
                            </Box>

                            {/* 疾患詳細 */}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.primary',
                                  fontSize: '0.75rem',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                }}
                              >
                                {drug.diseaseSubcategory || '-'}
                              </Typography>
                            </Box>

                            {/* 薬効分類 */}
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.primary',
                                  fontSize: '0.75rem',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                }}
                              >
                                {drug.drugFunction || '-'}
                              </Typography>
                            </Box>

                            {/* 適応症 - ステータス履歴（1対1で表示） */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {drug.statusHistory && drug.statusHistory.length > 0 ? (
                                drug.statusHistory.map((sh, shIndex) => {
                                  const color = getEventTypeColor(sh.status, shIndex);
                                  const dateStr = sh.datetime ? sh.datetime.split(' ')[0] : '';
                                  return (
                                    <Box
                                      key={shIndex}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1,
                                        pb: 0.5,
                                        borderBottom: shIndex < drug.statusHistory.length - 1 ? '1px dashed #e2e8f0' : 'none',
                                      }}
                                    >
                                      {/* ステータス部分 */}
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                          minWidth: 100,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: color,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            color: color,
                                            fontWeight: 500,
                                            fontSize: '0.7rem',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {sh.status}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: 'text.secondary',
                                            fontSize: '0.65rem',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {dateStr}
                                        </Typography>
                                      </Box>
                                      {/* 適応症部分 */}
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: 'text.secondary',
                                          fontSize: '0.75rem',
                                          wordBreak: 'break-word',
                                          lineHeight: 1.3,
                                          flex: 1,
                                        }}
                                      >
                                        {sh.indication || '-'}
                                      </Typography>
                                    </Box>
                                  );
                                })
                              ) : (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>-</Typography>
                              )}
                            </Box>

                            {/* 更新日 */}
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                {drug.latestUpdateStr ? drug.latestUpdateStr.split(' ')[0] : ''}
                              </Typography>
                            </Box>
                          </Box>
                        ))}

                        {stats.aggregatedDrugData.length === 0 && (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              データがありません
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* グラフ表示 */}
                    {tabValue === 1 && (
                      <Grid container spacing={3}>
                        {/* 時系列グラフ - 月別推移 */}
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <TrendingUpIcon sx={{ color: '#2563eb' }} />
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                月別推移
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                                （イベントタイプ別）
                              </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={stats.timelineData}>
                                <defs>
                                  {stats.eventTypeList.map((eventType, idx) => {
                                    const color = getEventTypeColor(eventType, idx);
                                    return (
                                      <linearGradient key={eventType} id={`color-${eventType.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                      </linearGradient>
                                    );
                                  })}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Legend />
                                {stats.eventTypeList.map((eventType, idx) => {
                                  const color = getEventTypeColor(eventType, idx);
                                  return (
                                    <Area
                                      key={eventType}
                                      type="monotone"
                                      dataKey={eventType}
                                      stroke={color}
                                      fillOpacity={1}
                                      fill={`url(#color-${eventType.replace(/\s/g, '')})`}
                                      strokeWidth={2}
                                    />
                                  );
                                })}
                              </AreaChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>

                        {/* 疾患関連の3つのグラフ */}
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              疾患領域別 Top 10
                            </Typography>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={stats.diseaseChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [value, props.payload.fullName]}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              疾患カテゴリ別 Top 10
                            </Typography>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={stats.diseaseCategoryChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [value, props.payload.fullName]}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              疾患詳細別 Top 10
                            </Typography>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={stats.diseaseSubcategoryChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [value, props.payload.fullName]}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#c084fc" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                              企業別 Top 10
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={stats.companyChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [value, props.payload.fullName]}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                              ステータス別
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={stats.eventTypeChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={3}
                                  dataKey="value"
                                  label={({ name, percent }) => {
                                    // 3%未満は文字を表示しない
                                    if (percent < 0.03) return null;
                                    return `${name} (${(percent * 100).toFixed(0)}%)`;
                                  }}
                                  labelLine={({ percent }) => percent >= 0.03}
                                >
                                  {stats.eventTypeChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.isOther ? '#94a3b8' : getEventTypeColor(entry.name, index)}
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', maxWidth: 250 }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const percent = ((data.value / filteredData.length) * 100).toFixed(1);
                                      if (data.isOther && data.details) {
                                        return (
                                          <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, border: '1px solid #e2e8f0', boxShadow: 2 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                              その他: {data.value}件 ({percent}%)
                                            </Typography>
                                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                              {data.details.map((item, idx) => (
                                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                                  <span>{item.name}</span>
                                                  <span>{item.value}件</span>
                                                </Box>
                                              ))}
                                            </Box>
                                          </Box>
                                        );
                                      }
                                      return (
                                        <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, border: '1px solid #e2e8f0', boxShadow: 2 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {data.name}: {data.value}件 ({percent}%)
                                          </Typography>
                                        </Box>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>

                        {/* 薬品名別 Top 10 */}
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                              薬品名別 Top 10
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={stats.drugNameChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [value, props.payload.fullName]}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Paper>
                        </Grid>

                      </Grid>
                    )}

                  </Box>
                </Paper>
              </>
            )}
          </Container>
        </Box>
      </Box>

      {/* CSS for refresh animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ThemeProvider>
  );
}

export default App;
