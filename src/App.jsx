import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  return (
    <Router>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">線上問卷系統</h1>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/surveys" element={<SurveyList />} />
          <Route path="/surveys/new" element={<SurveyEditor />} />
          <Route path="/surveys/:id/fill" element={<SurveyFill />} />
          <Route path="/surveys/:id/results" element={<SurveyResults />} />
        </Routes>
      </div>
    </Router>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/surveys');
    } catch (err) {
      alert('登入失敗');
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-2">登入</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border p-2 w-full mb-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼" type="password" className="border p-2 w-full mb-2" />
      <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded w-full">登入</button>
      <p className="mt-2">沒有帳號？<Link to="/register" className="text-blue-500">註冊</Link></p>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      await axios.post('http://localhost:5000/api/register', { email, password });
      navigate('/');
    } catch (err) {
      alert('註冊失敗');
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-2">註冊</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border p-2 w-full mb-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼" type="password" className="border p-2 w-full mb-2" />
      <button onClick={handleRegister} className="bg-green-500 text-white px-4 py-2 rounded w-full">註冊</button>
    </div>
  );
}

function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurveys = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/surveys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(res.data);
    };
    fetchSurveys();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('確定要刪除嗎？')) {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/surveys/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(surveys.filter((s) => s._id !== id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">我的問卷</h2>
        <div className="space-x-2">
          <Link to="/surveys/new" className="bg-green-500 text-white px-3 py-1 rounded">新增問卷</Link>
          <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">登出</button>
        </div>
      </div>
      <ul className="space-y-2">
        {surveys.map((s) => (
          <li key={s._id} className="border p-2 flex justify-between items-center">
            {s.title}
            <div className="space-x-2">
              <Link to={`/surveys/${s._id}/fill`} className="text-blue-500">填寫</Link>
              <Link to={`/surveys/${s._id}/results`} className="text-green-500">結果</Link>
              <button onClick={() => handleDelete(s._id)} className="text-red-500">刪除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SurveyEditor() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    const token = localStorage.getItem('token');
    await axios.post('http://localhost:5000/api/surveys', { title, description }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate('/surveys');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">建立問卷</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="問卷標題" className="border p-2 w-full mb-2" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="問卷描述" className="border p-2 w-full mb-2"></textarea>
      <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded">發布問卷</button>
    </div>
  );
}

function SurveyFill() {
  const { id } = useParams();
  const [age, setAge] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:5000/api/surveys/${id}/answers`, { age }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    alert('送出成功！');
    navigate('/surveys');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">填寫問卷</h2>
      <p>請回答下列問題：</p>
      <div className="mb-2">
        <p>1. 您的年齡？</p>
        <input value={age} onChange={(e) => setAge(e.target.value)} className="border p-2 w-full" />
      </div>
      <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">送出</button>
    </div>
  );
}

function SurveyResults() {
  const { id } = useParams();
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/surveys/${id}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
    };
    fetchResults();
  }, [id]);

  const data = {
    labels: results.map((r) => `${r._id}歲`),
    datasets: [
      {
        label: '人數',
        data: results.map((r) => r.count),
        backgroundColor: 'rgba(34,197,94,0.5)',
      },
    ],
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">問卷結果</h2>
      <Bar data={data} />
    </div>
  );
}

export default App;