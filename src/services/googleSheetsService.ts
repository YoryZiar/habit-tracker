export interface HabitRecord {
  id: string;
  name: string;
  type: 'boolean' | 'quantitative';
  target: number;
  unit?: string;
  records: Record<string, string | number>;
  createdAt: string;
  recurrence?: 'daily' | 'weekly' | 'specific_days';
  specificDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  icon?: string;
}

export interface TodoRecord {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

const getSpreadsheetId = () => {
  return localStorage.getItem('spreadsheet_id') || import.meta.env.VITE_SPREADSHEET_ID;
};
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SHEET_NAME = 'Sheet1'; // Default sheet name
const TODO_SHEET_NAME = 'Todos';

const checkAuthError = (res: Response) => {
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  return res;
};

// --- Helper: token retrieval terpusat ---
const getToken = (): string => {
  const token = localStorage.getItem('gapi_access_token');
  if (!token) throw new Error('Token tidak ditemukan');
  return token;
};

// --- Helper: konversi HabitRecord ke row array Google Sheets ---
const habitToRow = (habit: HabitRecord): (string | number)[] => [
  habit.id,
  habit.name,
  habit.type,
  habit.target,
  habit.unit || '',
  JSON.stringify(habit.records),
  habit.createdAt,
  habit.recurrence || 'daily',
  JSON.stringify(habit.specificDays || []),
  habit.icon || '',
];

// --- Helper: konversi TodoRecord ke row array Google Sheets ---
const todoToRow = (todo: TodoRecord): (string | boolean)[] => [
  todo.id,
  todo.text,
  todo.completed ? 'TRUE' : 'FALSE',
  todo.createdAt,
  todo.dueDate || '',
  todo.description || '',
  todo.priority || '',
];

// --- Helper: ambil sheetId dari nama sheet ---
const getSheetId = async (token: string, sheetName: string): Promise<number> => {
  const resInfo = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}?key=${API_KEY}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  checkAuthError(resInfo);
  const infoData = await resInfo.json();
  const sheet = infoData.sheets.find((s: { properties: { title: string; sheetId: number } }) =>
    s.properties.title === sheetName
  );
  if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan`);
  return sheet.properties.sheetId;
};

// --- Helper: retry fetch dengan re-authenticate jika gagal ---
const fetchWithRetry = async (
  url: string,
  token: string,
  authenticateFn: (token: string) => Promise<boolean>
): Promise<Response> => {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    await authenticateFn(token);
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    checkAuthError(res);
  }
  return res;
};

export const googleSheetsService = {
  // Autentikasi API
  authenticate: async (token: string): Promise<boolean> => {
    localStorage.setItem('gapi_access_token', token);
    
    // Test connection and get spreadsheet info
    const resInfo = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resInfo.ok) {
      throw new Error('Token tidak valid atau tidak memiliki akses ke Spreadsheet');
    }

    const infoData = await resInfo.json();
    const hasTodosSheet = infoData.sheets.some((s: any) => s.properties.title === TODO_SHEET_NAME);

    // Initialize Habit headers if empty
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A1:J1?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A1:J1?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [['id', 'name', 'type', 'target', 'unit', 'records', 'createdAt', 'recurrence', 'specificDays', 'icon']] })
      });
    }

    // Initialize Todos sheet if not exists
    if (!hasTodosSheet) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TODO_SHEET_NAME } } }] })
      });
      
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A1:G1?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [['id', 'text', 'completed', 'createdAt', 'dueDate', 'description', 'priority']] })
      });
    }
    
    return true;
  },

  // Fetch Habits (GET)
  getHabits: async (): Promise<HabitRecord[]> => {
    const token = getToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:J?key=${API_KEY}`;
    const res = await fetchWithRetry(url, token, googleSheetsService.authenticate);

    if (!res.ok) throw new Error('Gagal mengambil data dari Google Sheets');

    const data = await res.json();
    if (!data.values || data.values.length <= 1) return [];

    return data.values.slice(1).map((row: string[]) => ({
      id: row[0],
      name: row[1],
      type: row[2] as 'boolean' | 'quantitative',
      target: Number(row[3]),
      unit: row[4] || '',
      records: row[5] ? JSON.parse(row[5]) : {},
      createdAt: row[6],
      recurrence: (row[7] as 'daily' | 'weekly' | 'specific_days') || 'daily',
      specificDays: row[8] ? JSON.parse(row[8]) : [],
      icon: row[9] || ''
    }));
  },

  // Batch Update Habits
  batchUpdateHabits: async (habits: HabitRecord[]): Promise<boolean> => {
    if (habits.length === 0) return true;
    const token = getToken();

    const resGet = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:A?key=${API_KEY}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;

    const data = habits.map(habit => {
      const rowIndex = dataGet.values.findIndex((row: string[]) => row[0] === habit.id);
      if (rowIndex === -1) return null;
      return {
        range: `${SHEET_NAME}!A${rowIndex + 1}:J${rowIndex + 1}`,
        values: [habitToRow(habit)]
      };
    }).filter(Boolean);

    if (data.length === 0) return true;

    const resBatch = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values:batchUpdate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'RAW', data })
      }
    ).then(checkAuthError);

    return resBatch.ok;
  },

  // Tambah Habit Baru (POST)
  addHabit: async (habit: HabitRecord): Promise<boolean> => {
    const token = getToken();

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:J:append?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [habitToRow(habit)] })
      }
    ).then(checkAuthError);

    return res.ok;
  },

  // Reorder Habits (Bulk Update)
  reorderHabits: async (habits: HabitRecord[]): Promise<boolean> => {
    const token = getToken();
    const rows = habits.map(habitToRow);

    const resPut = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A2:J${Math.max(2, rows.length + 1)}?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      }
    ).then(checkAuthError);

    return resPut.ok;
  },

  // Hapus Habit (DELETE via batchUpdate)
  deleteHabit: async (id: string): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === id);
    if (rowIndex === -1) return false;
    
    const resDelete = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // gid=0
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      })
    }).then(checkAuthError);
    
    return resDelete.ok;
  },

  // --- TODOS ---
  getTodos: async (): Promise<TodoRecord[]> => {
    const token = getToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:G?key=${API_KEY}`;
    const res = await fetchWithRetry(url, token, googleSheetsService.authenticate);

    if (!res.ok) throw new Error('Gagal mengambil data Todo dari Google Sheets');

    const data = await res.json();
    if (!data.values || data.values.length <= 1) return [];

    return data.values.slice(1).map((row: string[]) => ({
      id: row[0],
      text: row[1],
      completed: row[2] === 'TRUE',
      createdAt: row[3],
      dueDate: row[4] || undefined,
      description: row[5] || undefined,
      priority: row[6] || undefined
    }));
  },

  addTodo: async (todo: TodoRecord): Promise<boolean> => {
    const token = getToken();

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:G:append?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [todoToRow(todo)] })
      }
    ).then(checkAuthError);

    return res.ok;
  },

  batchUpdateTodos: async (todos: TodoRecord[]): Promise<boolean> => {
    if (todos.length === 0) return true;
    const token = getToken();

    const resGet = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;

    const data = todos.map(todo => {
      const rowIndex = dataGet.values.findIndex((row: string[]) => row[0] === todo.id);
      if (rowIndex === -1) return null;
      return {
        range: `${TODO_SHEET_NAME}!A${rowIndex + 1}:G${rowIndex + 1}`,
        values: [todoToRow(todo)]
      };
    }).filter(Boolean);

    if (data.length === 0) return true;

    const resBatch = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values:batchUpdate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'RAW', data })
      }
    ).then(checkAuthError);

    return resBatch.ok;
  },

  deleteTodo: async (id: string): Promise<boolean> => {
    const token = getToken();
    const sheetId = await getSheetId(token, TODO_SHEET_NAME);

    const resGet = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;

    const rowIndex = dataGet.values.findIndex((row: string[]) => row[0] === id);
    if (rowIndex === -1) return false;

    const resDelete = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
            }
          }]
        })
      }
    ).then(checkAuthError);

    return resDelete.ok;
  },

  batchDeleteTodos: async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    const token = getToken();
    const sheetId = await getSheetId(token, TODO_SHEET_NAME);

    const resGet = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;

    const rowIndices = ids
      .map(id => dataGet.values.findIndex((row: string[]) => row[0] === id))
      .filter(idx => idx !== -1)
      .sort((a, b) => b - a); // descending — hapus dari bawah ke atas

    if (rowIndices.length === 0) return true;

    const requests = rowIndices.map(rowIndex => ({
      deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
      }
    }));

    const resDelete = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      }
    ).then(checkAuthError);

    return resDelete.ok;
  },

  reorderTodos: async (todos: TodoRecord[]): Promise<boolean> => {
    const token = getToken();
    const rows = todos.map(todoToRow);

    const resPut = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A2:G${Math.max(2, rows.length + 1)}?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      }
    ).then(checkAuthError);

    return resPut.ok;
  }
};
