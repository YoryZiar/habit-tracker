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
    const token = localStorage.getItem('gapi_access_token');
    if (!token) throw new Error('Token tidak ditemukan');

    let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:J?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      try {
        await googleSheetsService.authenticate(token);
        res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:J?key=${API_KEY}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        checkAuthError(res);
      } catch (e) {
        if (e instanceof Error && e.message === 'UNAUTHORIZED') throw e;
        console.error("Error during authentication retry:", e);
      }
    }

    if (!res.ok) throw new Error('Gagal mengambil data dari Google Sheets');
    
    const data = await res.json();
    if (!data.values || data.values.length <= 1) return []; // Empty or only headers
    
    return data.values.slice(1).map((row: any[]) => ({
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

  // Update Data (PUT)
  updateHabit: async (habit: HabitRecord): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    // Find row index
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === habit.id);
    if (rowIndex === -1) return false;
    
    const actualRowNumber = rowIndex + 1;
    
    const row = [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit || '',
      JSON.stringify(habit.records),
      habit.createdAt,
      habit.recurrence || 'daily',
      JSON.stringify(habit.specificDays || []),
      habit.icon || ''
    ];
    
    const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A${actualRowNumber}:J${actualRowNumber}?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }).then(checkAuthError);
    
    return resPut.ok;
  },

  // Batch Update Habits
  batchUpdateHabits: async (habits: HabitRecord[]): Promise<boolean> => {
    if (habits.length === 0) return true;
    const token = localStorage.getItem('gapi_access_token');
    
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const data = habits.map(habit => {
      const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === habit.id);
      if (rowIndex === -1) return null;
      
      const actualRowNumber = rowIndex + 1;
      const row = [
        habit.id,
        habit.name,
        habit.type,
        habit.target,
        habit.unit || '',
        JSON.stringify(habit.records),
        habit.createdAt,
        habit.recurrence || 'daily',
        JSON.stringify(habit.specificDays || []),
        habit.icon || ''
      ];
      
      return {
        range: `${SHEET_NAME}!A${actualRowNumber}:J${actualRowNumber}`,
        values: [row]
      };
    }).filter(Boolean);

    if (data.length === 0) return true;

    const resBatch = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data
      })
    }).then(checkAuthError);
    
    return resBatch.ok;
  },
  
  // Tambah Habit Baru (POST)
  addHabit: async (habit: HabitRecord): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    const row = [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit || '',
      JSON.stringify(habit.records),
      habit.createdAt,
      habit.recurrence || 'daily',
      JSON.stringify(habit.specificDays || []),
      habit.icon || ''
    ];
    
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A:J:append?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }).then(checkAuthError);
    
    return res.ok;
  },
  
  // Reorder Habits (Bulk Update)
  reorderHabits: async (habits: HabitRecord[]): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    if (!token) return false;

    const rows = habits.map(habit => [
      habit.id,
      habit.name,
      habit.type,
      habit.target,
      habit.unit || '',
      JSON.stringify(habit.records),
      habit.createdAt,
      habit.recurrence || 'daily',
      JSON.stringify(habit.specificDays || []),
      habit.icon || ''
    ]);

    // Update the entire range starting from A2
    const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${SHEET_NAME}!A2:J${Math.max(2, rows.length + 1)}?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    }).then(checkAuthError);

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
    const token = localStorage.getItem('gapi_access_token');
    if (!token) throw new Error('Token tidak ditemukan');

    let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:G?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Jika gagal (kemungkinan karena sheet Todos belum ada), coba autentikasi ulang untuk membuat sheet
    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      try {
        await googleSheetsService.authenticate(token);
        // Coba fetch lagi
        res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:G?key=${API_KEY}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        checkAuthError(res);
      } catch (e) {
        if (e instanceof Error && e.message === 'UNAUTHORIZED') throw e;
        console.error("Error during authentication retry:", e);
      }
    }
    
    if (!res.ok) throw new Error('Gagal mengambil data Todo dari Google Sheets');
    
    const data = await res.json();
    if (!data.values || data.values.length <= 1) return [];
    
    return data.values.slice(1).map((row: any[]) => ({
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
    const token = localStorage.getItem('gapi_access_token');
    const row = [todo.id, todo.text, todo.completed ? 'TRUE' : 'FALSE', todo.createdAt, todo.dueDate || '', todo.description || '', todo.priority || ''];
    
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:G:append?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }).then(checkAuthError);
    
    return res.ok;
  },

  updateTodo: async (todo: TodoRecord): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === todo.id);
    if (rowIndex === -1) return false;
    
    const actualRowNumber = rowIndex + 1;
    const row = [todo.id, todo.text, todo.completed ? 'TRUE' : 'FALSE', todo.createdAt, todo.dueDate || '', todo.description || '', todo.priority || ''];
    
    const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A${actualRowNumber}:G${actualRowNumber}?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }).then(checkAuthError);
    
    return resPut.ok;
  },

  batchUpdateTodos: async (todos: TodoRecord[]): Promise<boolean> => {
    if (todos.length === 0) return true;
    const token = localStorage.getItem('gapi_access_token');
    
    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const data = todos.map(todo => {
      const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === todo.id);
      if (rowIndex === -1) return null;
      
      const actualRowNumber = rowIndex + 1;
      const row = [todo.id, todo.text, todo.completed ? 'TRUE' : 'FALSE', todo.createdAt, todo.dueDate || '', todo.description || '', todo.priority || ''];
      
      return {
        range: `${TODO_SHEET_NAME}!A${actualRowNumber}:G${actualRowNumber}`,
        values: [row]
      };
    }).filter(Boolean);

    if (data.length === 0) return true;

    const resBatch = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data
      })
    }).then(checkAuthError);
    
    return resBatch.ok;
  },

  deleteTodo: async (id: string): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    
    // Get sheetId for Todos
    const resInfo = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const infoData = await resInfo.json();
    const sheet = infoData.sheets.find((s: any) => s.properties.title === TODO_SHEET_NAME);
    if (!sheet) return false;
    const sheetId = sheet.properties.sheetId;

    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    const rowIndex = dataGet.values.findIndex((row: any[]) => row[0] === id);
    if (rowIndex === -1) return false;
    
    const resDelete = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
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

  batchDeleteTodos: async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    const token = localStorage.getItem('gapi_access_token');
    
    // Get sheetId for Todos
    const resInfo = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const infoData = await resInfo.json();
    const sheet = infoData.sheets.find((s: any) => s.properties.title === TODO_SHEET_NAME);
    if (!sheet) return false;
    const sheetId = sheet.properties.sheetId;

    const resGet = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A:A?key=${API_KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataGet = await resGet.json();
    if (!dataGet.values) return false;
    
    // Find all row indices to delete
    const rowIndices = ids.map(id => dataGet.values.findIndex((row: any[]) => row[0] === id))
                          .filter(index => index !== -1)
                          .sort((a, b) => b - a); // Sort descending to delete from bottom up
    
    if (rowIndices.length === 0) return true;
    
    const requests = rowIndices.map(rowIndex => ({
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1
        }
      }
    }));
    
    const resDelete = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}:batchUpdate?key=${API_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }).then(checkAuthError);
    
    return resDelete.ok;
  },

  reorderTodos: async (todos: TodoRecord[]): Promise<boolean> => {
    const token = localStorage.getItem('gapi_access_token');
    if (!token) return false;

    const rows = todos.map(todo => [
      todo.id,
      todo.text,
      todo.completed ? 'TRUE' : 'FALSE',
      todo.createdAt,
      todo.dueDate || '',
      todo.description || '',
      todo.priority || ''
    ]);

    // Update the entire range starting from A2
    const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}/values/${TODO_SHEET_NAME}!A2:G${Math.max(2, rows.length + 1)}?valueInputOption=RAW&key=${API_KEY}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ values: rows })
    }).then(checkAuthError);

    return resPut.ok;
  }
};
