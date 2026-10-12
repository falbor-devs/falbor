'use client';
import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import type { Chat } from '~/lib/persistence/chats';
import { classNames } from '~/utils/classNames';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

type DataVisualizationProps = {
  chats: Chat[];
};

export function DataVisualization({ chats }: DataVisualizationProps) {
  const [chatsByDate, setChatsByDate] = useState<Record<string, number>>({});
  const [messagesByRole, setMessagesByRole] = useState<Record<string, number>>({});
  const [apiKeyUsage, setApiKeyUsage] = useState<Array<{ provider: string; count: number }>>([]);
  const [averageMessagesPerChat, setAverageMessagesPerChat] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chats || chats.length === 0) {
      return;
    }

    
    const chatDates: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};
    const apiUsage: Record<string, number> = {};
    let totalMessages = 0;

    chats.forEach((chat) => {
      const date = new Date(chat.timestamp).toLocaleDateString();
      chatDates[date] = (chatDates[date] || 0) + 1;

      chat.messages.forEach((message) => {
        roleCounts[message.role] = (roleCounts[message.role] || 0) + 1;
        totalMessages++;

        if (message.role === 'assistant') {
          const providerMatch = message.content.match(/provider:\s*([\w-]+)/i);
          const provider = providerMatch ? providerMatch[1] : 'unknown';
          apiUsage[provider] = (apiUsage[provider] || 0) + 1;
        }
      });
    });

    const sortedDates = Object.keys(chatDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedChatsByDate: Record<string, number> = {};
    sortedDates.forEach((date) => {
      sortedChatsByDate[date] = chatDates[date];
    });

    setChatsByDate(sortedChatsByDate);
    setMessagesByRole(roleCounts);
    setApiKeyUsage(Object.entries(apiUsage).map(([provider, count]) => ({ provider, count })));
    setAverageMessagesPerChat(totalMessages / chats.length);
  }, [chats]);

  
  const getThemeColor = (varName: string): string => {
    
    if (typeof document !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    
    return isDarkMode ? '#FFFFFF' : '#000000';
  };

  
  const chartColors = {
    grid: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    text: getThemeColor('--falbor-elements-textPrimary'),
    textSecondary: getThemeColor('--falbor-elements-textSecondary'),
    background: getThemeColor('--falbor-elements-bg-depth-1'),
    accent: getThemeColor('--falbor-elements-button-primary-text'),
    border: getThemeColor('--falbor-elements-borderColor'),
  };

  const getChartColors = (index: number) => {
    
    const baseColors = [
      
      {
        base: getThemeColor('--falbor-elements-button-primary-text'),
      },

      
      {
        base: isDarkMode ? 'rgb(244, 114, 182)' : 'rgb(236, 72, 153)',
      },

      
      {
        base: getThemeColor('--falbor-elements-icon-success'),
      },

      
      {
        base: isDarkMode ? 'rgb(250, 204, 21)' : 'rgb(234, 179, 8)',
      },

      
      {
        base: isDarkMode ? 'rgb(56, 189, 248)' : 'rgb(14, 165, 233)',
      },
    ];

    
    const color = baseColors[index % baseColors.length].base;

    
    let r = 0,
      g = 0,
      b = 0;

    
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);

    if (rgbMatch) {
      [, r, g, b] = rgbMatch.map(Number);
    } else if (rgbaMatch) {
      [, r, g, b] = rgbaMatch.map(Number);
    } else if (color.startsWith('#')) {
      
      const hex = color.slice(1);
      const bigint = parseInt(hex, 16);
      r = (bigint >> 16) & 255;
      g = (bigint >> 8) & 255;
      b = bigint & 255;
    }

    return {
      bg: `rgba(${r}, ${g}, ${b}, ${isDarkMode ? 0.7 : 0.5})`,
      border: `rgba(${r}, ${g}, ${b}, ${isDarkMode ? 0.9 : 0.8})`,
    };
  };

  const chartData = {
    history: {
      labels: Object.keys(chatsByDate),
      datasets: [
        {
          label: 'Chats Created',
          data: Object.values(chatsByDate),
          backgroundColor: getChartColors(0).bg,
          borderColor: getChartColors(0).border,
          borderWidth: 1,
        },
      ],
    },
    roles: {
      labels: Object.keys(messagesByRole),
      datasets: [
        {
          label: 'Messages by Role',
          data: Object.values(messagesByRole),
          backgroundColor: Object.keys(messagesByRole).map((_, i) => getChartColors(i).bg),
          borderColor: Object.keys(messagesByRole).map((_, i) => getChartColors(i).border),
          borderWidth: 1,
        },
      ],
    },
    apiUsage: {
      labels: apiKeyUsage.map((item) => item.provider),
      datasets: [
        {
          label: 'API Usage',
          data: apiKeyUsage.map((item) => item.count),
          backgroundColor: apiKeyUsage.map((_, i) => getChartColors(i).bg),
          borderColor: apiKeyUsage.map((_, i) => getChartColors(i).border),
          borderWidth: 1,
        },
      ],
    },
  };

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: chartColors.text,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: chartColors.text,
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          padding: 16,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        color: chartColors.text,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: 16,
      },
      tooltip: {
        titleColor: chartColors.text,
        bodyColor: chartColors.text,
        backgroundColor: isDarkMode
          ? 'rgba(23, 23, 23, 0.8)' 
          : 'rgba(255, 255, 255, 0.8)', 
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    },
  };

  const chartOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      title: {
        ...baseChartOptions.plugins.title,
        text: 'Chat History',
      },
    },
    scales: {
      x: {
        grid: {
          color: chartColors.grid,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: chartColors.text,
          font: {
            weight: 500,
          },
        },
      },
      y: {
        grid: {
          color: chartColors.grid,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: chartColors.text,
          font: {
            weight: 500,
          },
        },
      },
    },
  };

  const pieOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      title: {
        ...baseChartOptions.plugins.title,
        text: 'Message Distribution',
      },
      legend: {
        ...baseChartOptions.plugins.legend,
        position: 'right' as const,
      },
      datalabels: {
        color: chartColors.text,
        font: {
          weight: 'bold' as const,
        },
      },
    },
  };

  if (chats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="i-ph-chart-line-duotone w-12 h-12 mx-auto mb-4 text-falbor-elements-textTertiary opacity-80" />
        <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-2">No Data Available</h3>
        <p className="text-falbor-elements-textSecondary">
          Start creating chats to see your usage statistics and data visualization.
        </p>
      </div>
    );
  }

  const cardClasses = classNames(
    'p-6 rounded-lg shadow-sm',
    'bg-falbor-elements-bg-depth-1',
    'border border-falbor-elements-borderColor',
  );

  const statClasses = classNames('text-3xl font-bold text-falbor-elements-textPrimary', 'flex items-center gap-3');

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-4">Total Chats</h3>
          <div className={statClasses}>
            <div className="i-ph-chats-duotone w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            <span>{chats.length}</span>
          </div>
        </div>

        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-4">Total Messages</h3>
          <div className={statClasses}>
            <div className="i-ph-chat-text-duotone w-8 h-8 text-pink-500 dark:text-pink-400" />
            <span>{Object.values(messagesByRole).reduce((sum, count) => sum + count, 0)}</span>
          </div>
        </div>

        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-4">Avg. Messages/Chat</h3>
          <div className={statClasses}>
            <div className="i-ph-chart-bar-duotone w-8 h-8 text-green-500 dark:text-green-400" />
            <span>{averageMessagesPerChat.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-6">Chat History</h3>
          <div className="h-64">
            <Bar data={chartData.history} options={chartOptions} />
          </div>
        </div>

        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-6">Message Distribution</h3>
          <div className="h-64">
            <Pie data={chartData.roles} options={pieOptions} />
          </div>
        </div>
      </div>

      {apiKeyUsage.length > 0 && (
        <div className={cardClasses}>
          <h3 className="text-lg font-medium text-falbor-elements-textPrimary mb-6">API Usage by Provider</h3>
          <div className="h-64">
            <Pie data={chartData.apiUsage} options={pieOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
