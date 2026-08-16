import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Todo } from '@dashylife/shared';

const API_URL = 'http://localhost:3000/api';

const COLORS = {
  bg: '#0F0F11',
  surface: '#18181B',
  surfaceActive: '#1E1E22',
  border: '#262626',
  borderSubtle: '#1A1A1A',
  primary: '#FFFFFF',
  secondary: '#A3A3A3',
  tertiary: '#737373',
  action: '#FFFFFF',
  actionText: '#0F0F11',
  accent: '#6366F1',
  danger: '#EF4444',
  warning: '#F59E0B',
};

export default function Main() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');

  const fetchTodos = async () => {
    const res = await fetch(API_URL + '/todos');
    const data = await res.json();
    setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch(API_URL + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    const data = await res.json();
    setTodos((prev) => [...prev, data]);
    setNewTitle('');
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const res = await fetch(API_URL + '/todos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    const data = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const deleteTodo = async (id: string) => {
    await fetch(API_URL + '/todos/' + id, { method: 'DELETE' });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <View style={[
      styles.todoItem,
      item.completed && styles.todoItemCompleted,
    ]}>
      <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.checkboxWrapper}>
        <Text style={styles.checkbox}>{item.completed ? '✓' : ''}</Text>
      </TouchableOpacity>
      <Text style={[
        styles.todoText,
        item.completed && styles.completedText,
      ]}>
        {item.title}
      </Text>
      <TouchableOpacity onPress={() => deleteTodo(item.id)} style={styles.deleteWrapper}>
        <Text style={styles.deleteButton}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DashyLife</Text>
        <Text style={styles.subtitle}>To-Do List</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Nova tarefa..."
          onSubmitEditing={addTodo}
          placeholderTextColor={COLORS.tertiary}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma tarefa encontrada.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.tertiary,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  addButton: {
    backgroundColor: COLORS.action,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  addButtonText: {
    color: COLORS.actionText,
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  todoItemCompleted: {
    opacity: 0.7,
  },
  checkboxWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.primary,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.tertiary,
  },
  deleteWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    color: COLORS.tertiary,
    fontSize: 18,
    fontWeight: '300',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: COLORS.tertiary,
    fontSize: 15,
  },
});