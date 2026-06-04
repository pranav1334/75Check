import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activePage, setActivePage] = useState("Dashboard");
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("");
  const [bunkResult, setBunkResult] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [attendanceEdits, setAttendanceEdits] = useState({});

  const [formData, setFormData] = useState({
    subject_name: "",
    total_classes: "",
    attended_classes: "",
    required_percentage: 75
  });

  const [timetableMode, setTimetableMode] = useState("view");

  const [timetableEntries, setTimetableEntries] = useState(() => {
    const saved = localStorage.getItem("75check_timetable");
    return saved ? JSON.parse(saved) : [];
  });

  const [timetableForm, setTimetableForm] = useState({
    subject_name: "",
    day: "",
    start_time: "",
    end_time: "",
    room: ""
  });

  const [uploadedTimetables, setUploadedTimetables] = useState(() => {
    const saved = localStorage.getItem("75check_uploaded_timetables");
    return saved ? JSON.parse(saved) : [];
  });

  const [uploadFile, setUploadFile] = useState(null);

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/subjects");
      const list = res.data.subjects || [];

      setSubjects(list);

      const editValues = {};
      list.forEach((subject) => {
        editValues[subject.id] = {
          total_classes: String(subject.total_classes),
          attended_classes: String(subject.attended_classes)
        };
      });
      setAttendanceEdits(editValues);

      if (list.length > 0) {
        const selectedExists = list.some(
          (subject) => String(subject.id) === String(selectedSubjectId)
        );

        if (!selectedSubjectId || !selectedExists) {
          setSelectedSubjectId(String(list[0].id));
        }
      } else {
        setSelectedSubjectId("");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to fetch subjects");
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "75check_timetable",
      JSON.stringify(timetableEntries)
    );
  }, [timetableEntries]);

  useEffect(() => {
    localStorage.setItem(
      "75check_uploaded_timetables",
      JSON.stringify(uploadedTimetables)
    );
  }, [uploadedTimetables]);

  const overview = useMemo(() => {
    const totalSubjects = subjects.length;

    const totalClasses = subjects.reduce(
      (sum, sub) => sum + Number(sub.total_classes),
      0
    );

    const attendedClasses = subjects.reduce(
      (sum, sub) => sum + Number(sub.attended_classes),
      0
    );

    const bunkedClasses = totalClasses - attendedClasses;

    const overallAttendance =
      totalClasses === 0
        ? 0
        : Number(((attendedClasses / totalClasses) * 100).toFixed(0));

    return {
      totalSubjects,
      totalClasses,
      attendedClasses,
      bunkedClasses,
      overallAttendance
    };
  }, [subjects]);

  const alerts = subjects.filter(
    (subject) =>
      Number(subject.attendance_percentage) <
      Number(subject.required_percentage)
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuClick = (page) => {
    setActivePage(page);
    setMessage("");
    setBunkResult(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setMessage("");
    setBunkResult(null);

    try {
      await api.post("/subjects", {
        subject_name: formData.subject_name,
        total_classes: Number(formData.total_classes),
        attended_classes: Number(formData.attended_classes),
        required_percentage: Number(formData.required_percentage)
      });

      setMessage("Subject added successfully");

      setFormData({
        subject_name: "",
        total_classes: "",
        attended_classes: "",
        required_percentage: 75
      });

      fetchSubjects();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          "Failed to add subject"
      );
    }
  };

  const handleCanBunk = async (id = selectedSubjectId) => {
    setMessage("");

    const subjectId = String(id || "");

    if (!subjectId) {
      setMessage("Please select a subject first");
      return;
    }

    try {
      const res = await api.get(`/subjects/${subjectId}/can-bunk`);

      setSelectedSubjectId(subjectId);
      setBunkResult(res.data);
      setActivePage("Bunk Calculator");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          "Failed to check bunk status"
      );
    }
  };

  const handleDelete = async (id) => {
    setMessage("");
    setBunkResult(null);

    try {
      await api.delete(`/subjects/${id}`);
      setMessage("Subject deleted successfully");
      fetchSubjects();
    } catch {
      setMessage("Failed to delete subject");
    }
  };

  const handleAttendanceInputChange = (id, field, value) => {
    setAttendanceEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleUpdateAttendance = async (subject) => {
    setMessage("");
    setBunkResult(null);

    const edit = attendanceEdits[subject.id];

    if (!edit) {
      setMessage("Nothing to update");
      return;
    }

    const totalClasses = Number(edit.total_classes);
    const attendedClasses = Number(edit.attended_classes);

    if (Number.isNaN(totalClasses) || Number.isNaN(attendedClasses)) {
      setMessage("Please enter valid numbers");
      return;
    }

    if (totalClasses < 0 || attendedClasses < 0) {
      setMessage("Classes cannot be negative");
      return;
    }

    if (attendedClasses > totalClasses) {
      setMessage("Attended classes cannot be greater than total classes");
      return;
    }

    try {
      await api.put(`/subjects/${subject.id}`, {
        subject_name: subject.subject_name,
        total_classes: totalClasses,
        attended_classes: attendedClasses,
        required_percentage: Number(subject.required_percentage)
      });

      setMessage(`${subject.subject_name} attendance updated successfully`);
      fetchSubjects();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          "Failed to update attendance"
      );
    }
  };

  const handleTimetableChange = (e) => {
    setTimetableForm({
      ...timetableForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddTimetable = (e) => {
    e.preventDefault();

    if (
      !timetableForm.subject_name ||
      !timetableForm.day ||
      !timetableForm.start_time ||
      !timetableForm.end_time ||
      !timetableForm.room
    ) {
      setMessage("Please fill all timetable fields");
      return;
    }

    const newEntry = {
      id: Date.now(),
      ...timetableForm
    };

    setTimetableEntries([newEntry, ...timetableEntries]);

    setTimetableForm({
      subject_name: "",
      day: "",
      start_time: "",
      end_time: "",
      room: ""
    });

    setMessage("Timetable added successfully");
    setTimetableMode("view");
  };

  const handleDeleteTimetable = (id) => {
    setTimetableEntries(timetableEntries.filter((entry) => entry.id !== id));
    setMessage("Timetable entry deleted");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Only JPG, PNG, and PDF files are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("File size should be less than 2MB");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setUploadFile({
        id: Date.now(),
        name: file.name,
        type: file.type,
        data: reader.result,
        uploaded_at: new Date().toLocaleString()
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSaveUploadedTimetable = () => {
    if (!uploadFile) {
      setMessage("Please choose a timetable photo or PDF first");
      return;
    }

    setUploadedTimetables([uploadFile, ...uploadedTimetables]);
    setUploadFile(null);
    setMessage("Timetable file uploaded successfully");
    setTimetableMode("view");
  };

  const handleDeleteUploadedTimetable = (id) => {
    setUploadedTimetables(uploadedTimetables.filter((file) => file.id !== id));
    setMessage("Uploaded timetable deleted");
  };

  const getRowIcon = (index) => {
    const icons = ["</>", "fx", "DB", "OS", "Σ", "CN", "AI", "ML"];
    return icons[index % icons.length];
  };

  const menuItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Subjects", icon: "▣" },
    { name: "Attendance", icon: "◉" },
    { name: "Bunk Calculator", icon: "▣" },
    { name: "Timetable", icon: "▤" },
    { name: "Alerts", icon: "⌁" },
    { name: "Reports", icon: "▧" },
    { name: "Settings", icon: "⚙" }
  ];

  const SubjectTable = () => (
    <section className="subjects-table-card">
      <h3>Your Subjects</h3>

      {subjects.length === 0 ? (
        <p className="empty-text">No subjects added yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attendance</th>
                <th>Attended</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {subjects.map((subject, index) => (
                <tr key={subject.id}>
                  <td>
                    <div className="subject-name-cell">
                      <div className={`subject-icon icon-${index % 6}`}>
                        {getRowIcon(index)}
                      </div>

                      <div>
                        <h4>{subject.subject_name}</h4>
                        <p>CSE20{index + 1}</p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="attendance-cell">
                      <div
                        className={`mini-ring ${subject.status.toLowerCase()}`}
                        style={{
                          "--value": `${subject.attendance_percentage * 3.6}deg`
                        }}
                      ></div>

                      <span>{subject.attendance_percentage}%</span>
                    </div>
                  </td>

                  <td>{subject.attended_classes}</td>
                  <td>{subject.total_classes}</td>

                  <td>
                    <span
                      className={`table-status ${subject.status.toLowerCase()}`}
                    >
                      {subject.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleCanBunk(subject.id)}>
                        Check
                      </button>

                      <button
                        className="small-delete"
                        onClick={() => handleDelete(subject.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tip-box">
        💡 Tip: Try to keep your attendance above 75% in all subjects to stay
        on the safe side.
      </div>
    </section>
  );

  const AddSubjectCard = () => (
    <section className="add-card">
      <div className="card-title-row">
        <h3>Add New Subject</h3>
        <span>＋</span>
      </div>

      <form onSubmit={handleAddSubject}>
        <label>Subject Name</label>
        <input
          type="text"
          name="subject_name"
          placeholder="e.g. Data Structures"
          value={formData.subject_name}
          onChange={handleChange}
        />

        <label>Total Classes</label>
        <input
          type="number"
          name="total_classes"
          placeholder="e.g. 40"
          value={formData.total_classes}
          onChange={handleChange}
        />

        <label>Attended Classes</label>
        <input
          type="number"
          name="attended_classes"
          placeholder="e.g. 28"
          value={formData.attended_classes}
          onChange={handleChange}
        />

        <label>Required Percentage</label>
        <div className="percent-input">
          <input
            type="number"
            name="required_percentage"
            placeholder="e.g. 75"
            value={formData.required_percentage}
            onChange={handleChange}
          />
          <span>%</span>
        </div>

        <button type="submit">Add Subject</button>
      </form>
    </section>
  );

  const BunkCard = () => (
    <section className="bunk-card">
      <h3>📅 Can I bunk today?</h3>

      <label>Select subject</label>
      <select
        value={selectedSubjectId}
        onChange={(e) => {
          setSelectedSubjectId(e.target.value);
          setBunkResult(null);
        }}
      >
        {subjects.length === 0 ? (
          <option value="">No subjects available</option>
        ) : (
          subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.subject_name}
            </option>
          ))
        )}
      </select>

      {bunkResult ? (
        <div
          className={
            bunkResult.can_bunk
              ? "bunk-result-card recommended"
              : "bunk-result-card not-recommended"
          }
        >
          <h4>{bunkResult.can_bunk ? "Recommended" : "Not Recommended"}</h4>

          <p>
            {bunkResult.can_bunk
              ? "You can bunk this class safely."
              : "Attending the next class is important to stay safe."}
          </p>

          <div className="bunk-stats">
            <div>
              <span>If you bunk today</span>
              <strong>{bunkResult.after_bunk_percentage}%</strong>
              <small>Projected Attendance</small>
            </div>

            <div>
              <span>Minimum required</span>
              <strong>{bunkResult.required_percentage}%</strong>
              <small>To stay safe</small>
            </div>
          </div>
        </div>
      ) : (
        <div className="bunk-result-card neutral">
          <h4>Check your bunk status</h4>
          <p>Select a subject and click below.</p>
        </div>
      )}

      <button type="button" onClick={() => handleCanBunk(selectedSubjectId)}>
        {bunkResult ? "Re-check Bunk Status →" : "Check Bunk Status →"}
      </button>
    </section>
  );

  const renderPageContent = () => {
    if (activePage === "Subjects") {
      return (
        <div className="single-page-content">
          <h1>Subjects</h1>
          <p>Manage all your subject-wise attendance records.</p>

          {AddSubjectCard()}
          {SubjectTable()}
        </div>
      );
    }

    if (activePage === "Attendance") {
      return (
        <div className="single-page-content">
          <h1>Attendance</h1>
          <p>Edit total classes and attended classes for each subject.</p>

          <div className="attendance-edit-grid">
            {subjects.length === 0 ? (
              <p className="empty-text">No subjects available.</p>
            ) : (
              subjects.map((subject) => (
                <div className="attendance-edit-card" key={subject.id}>
                  <div className="attendance-edit-header">
                    <h3>{subject.subject_name}</h3>
                    <span
                      className={`table-status ${subject.status.toLowerCase()}`}
                    >
                      {subject.status}
                    </span>
                  </div>

                  <p>
                    Current Attendance:{" "}
                    <strong>{subject.attendance_percentage}%</strong>
                  </p>

                  <label>Total Classes</label>
                  <input
                    type="number"
                    value={
                      attendanceEdits[subject.id]?.total_classes ??
                      subject.total_classes
                    }
                    onChange={(e) =>
                      handleAttendanceInputChange(
                        subject.id,
                        "total_classes",
                        e.target.value
                      )
                    }
                  />

                  <label>Attended Classes</label>
                  <input
                    type="number"
                    value={
                      attendanceEdits[subject.id]?.attended_classes ??
                      subject.attended_classes
                    }
                    onChange={(e) =>
                      handleAttendanceInputChange(
                        subject.id,
                        "attended_classes",
                        e.target.value
                      )
                    }
                  />

                  <button onClick={() => handleUpdateAttendance(subject)}>
                    Save Changes
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activePage === "Bunk Calculator") {
      return (
        <div className="single-page-content">
          <h1>Bunk Calculator</h1>
          <p>Check whether you can bunk today without going below 75%.</p>

          {BunkCard()}
        </div>
      );
    }

    if (activePage === "Timetable") {
      return (
        <div className="single-page-content">
          <h1>Timetable</h1>
          <p>
            Create your weekly timetable manually or upload your timetable
            photo/PDF.
          </p>

          <div className="timetable-actions">
            <button
              className={timetableMode === "add" ? "active-time-btn" : ""}
              onClick={() => setTimetableMode("add")}
            >
              Add Manually
            </button>

            <button
              className={timetableMode === "upload" ? "active-time-btn" : ""}
              onClick={() => setTimetableMode("upload")}
            >
              Upload Photo/PDF
            </button>

            <button
              className={timetableMode === "view" ? "active-time-btn" : ""}
              onClick={() => setTimetableMode("view")}
            >
              View Timetable
            </button>
          </div>

          {timetableMode === "add" && (
            <section className="timetable-form-card">
              <h3>Add Timetable Manually</h3>

              <form onSubmit={handleAddTimetable}>
                <label>Subject Name</label>
                <input
                  type="text"
                  name="subject_name"
                  placeholder="e.g. FSD"
                  value={timetableForm.subject_name}
                  onChange={handleTimetableChange}
                />

                <label>Day</label>
                <select
                  name="day"
                  value={timetableForm.day}
                  onChange={handleTimetableChange}
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>

                <label>Start Time</label>
                <input
                  type="text"
                  name="start_time"
                  placeholder="e.g. 10:00 AM"
                  value={timetableForm.start_time}
                  onChange={handleTimetableChange}
                />

                <label>End Time</label>
                <input
                  type="text"
                  name="end_time"
                  placeholder="e.g. 11:00 AM"
                  value={timetableForm.end_time}
                  onChange={handleTimetableChange}
                />

                <label>Room Number</label>
                <input
                  type="text"
                  name="room"
                  placeholder="e.g. CSE-203"
                  value={timetableForm.room}
                  onChange={handleTimetableChange}
                />

                <button type="submit">Save Timetable</button>
              </form>
            </section>
          )}

          {timetableMode === "upload" && (
            <section className="upload-timetable-card">
              <h3>Upload Timetable Photo/PDF</h3>
              <p>
                Upload your college timetable as an image or PDF. Supported
                files: JPG, PNG, PDF. Maximum size: 2MB.
              </p>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
              />

              {uploadFile && (
                <div className="upload-preview">
                  <h4>Preview: {uploadFile.name}</h4>

                  {uploadFile.type === "application/pdf" ? (
                    <iframe
                      src={uploadFile.data}
                      title="PDF Preview"
                      className="pdf-preview"
                    ></iframe>
                  ) : (
                    <img
                      src={uploadFile.data}
                      alt="Timetable Preview"
                      className="image-preview"
                    />
                  )}

                  <button onClick={handleSaveUploadedTimetable}>
                    Save Uploaded Timetable
                  </button>
                </div>
              )}
            </section>
          )}

          {timetableMode === "view" && (
            <>
              {timetableEntries.length === 0 &&
              uploadedTimetables.length === 0 ? (
                <div className="empty-timetable-card">
                  <h3>No timetable created yet</h3>
                  <p>
                    Click <strong>Add Manually</strong> to enter timetable
                    details or <strong>Upload Photo/PDF</strong> to save your
                    college timetable file.
                  </p>
                </div>
              ) : (
                <>
                  {uploadedTimetables.length > 0 && (
                    <section className="uploaded-list-section">
                      <h3>Uploaded Timetable Files</h3>

                      <div className="uploaded-grid">
                        {uploadedTimetables.map((file) => (
                          <div className="uploaded-file-card" key={file.id}>
                            <div className="uploaded-file-top">
                              <div>
                                <h4>{file.name}</h4>
                                <p>{file.uploaded_at}</p>
                              </div>

                              <button
                                onClick={() =>
                                  handleDeleteUploadedTimetable(file.id)
                                }
                              >
                                Delete
                              </button>
                            </div>

                            {file.type === "application/pdf" ? (
                              <iframe
                                src={file.data}
                                title={file.name}
                                className="saved-pdf-preview"
                              ></iframe>
                            ) : (
                              <img
                                src={file.data}
                                alt={file.name}
                                className="saved-image-preview"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {timetableEntries.length > 0 && (
                    <section>
                      <h3 className="manual-table-title">Manual Timetable</h3>

                      <div className="simple-card-grid">
                        {timetableEntries.map((entry) => (
                          <div
                            className="simple-info-card timetable-card"
                            key={entry.id}
                          >
                            <div className="timetable-card-top">
                              <h3>{entry.subject_name}</h3>

                              <button
                                onClick={() =>
                                  handleDeleteTimetable(entry.id)
                                }
                              >
                                Delete
                              </button>
                            </div>

                            <p>Day: {entry.day}</p>
                            <p>
                              Time: {entry.start_time} - {entry.end_time}
                            </p>
                            <p>Room: {entry.room}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      );
    }

    if (activePage === "Alerts") {
      return (
        <div className="single-page-content">
          <h1>Alerts</h1>
          <p>Subjects below required attendance are shown here.</p>

          {alerts.length === 0 ? (
            <div className="success-alert">
              ✅ No danger alerts. All subjects are safe.
            </div>
          ) : (
            <div className="simple-card-grid">
              {alerts.map((subject) => (
                <div className="danger-alert-card" key={subject.id}>
                  <h3>{subject.subject_name}</h3>
                  <p>Current: {subject.attendance_percentage}%</p>
                  <p>Required: {subject.required_percentage}%</p>
                  <p>You need to attend {subject.need_to_attend} classes.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activePage === "Reports") {
      return (
        <div className="single-page-content">
          <h1>Reports</h1>
          <p>Your overall attendance summary.</p>

          <div className="report-grid">
            <div className="report-card">
              <h3>Total Subjects</h3>
              <strong>{overview.totalSubjects}</strong>
            </div>

            <div className="report-card">
              <h3>Total Classes</h3>
              <strong>{overview.totalClasses}</strong>
            </div>

            <div className="report-card">
              <h3>Attended Classes</h3>
              <strong>{overview.attendedClasses}</strong>
            </div>

            <div className="report-card">
              <h3>Bunked Classes</h3>
              <strong>{overview.bunkedClasses}</strong>
            </div>

            <div className="report-card">
              <h3>Overall Attendance</h3>
              <strong>{overview.overallAttendance}%</strong>
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "Settings") {
      return (
        <div className="single-page-content">
          <h1>Settings</h1>
          <p>Manage your profile and account.</p>

          <div className="settings-card">
            <h3>Profile</h3>
            <p>Name: {user?.name}</p>
            <p>Email: {user?.email}</p>

            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      );
    }

    return (
      <main className="dashboard-layout">
        <div className="left-content">
          <div className="welcome-box">
            <h1>Good morning, {user?.name || "Student"}! 👋</h1>
            <p>Here&apos;s your attendance overview for today.</p>
          </div>

          {message && <div className="message-box">{message}</div>}

          <div className="stats-grid">
            <div className="stat-card">
              <h4>Overall Attendance</h4>

              <div
                className="big-ring"
                style={{
                  "--value": `${overview.overallAttendance * 3.6}deg`
                }}
              >
                <div>
                  <strong>{overview.overallAttendance}%</strong>
                  <span>
                    {overview.overallAttendance >= 75 ? "Safe" : "Danger"}
                  </span>
                </div>
              </div>

              <p>You&apos;re on track!</p>
            </div>

            <div className="stat-card center-stat">
              <h4>Total Subjects</h4>
              <div className="stat-icon green-icon">📖</div>
              <strong>{overview.totalSubjects}</strong>
              <p>Active Subjects</p>
            </div>

            <div className="stat-card center-stat">
              <h4>Classes Attended</h4>
              <div className="stat-icon green-icon">📅</div>
              <strong>
                {overview.attendedClasses}
                <small> / {overview.totalClasses}</small>
              </strong>
              <p>This Semester</p>
            </div>

            <div className="stat-card center-stat">
              <h4>Classes Bunked</h4>
              <div className="stat-icon red-icon">🗓</div>
              <strong>{overview.bunkedClasses}</strong>
              <p>This Semester</p>
            </div>
          </div>

          {SubjectTable()}
        </div>

        <aside className="right-panel">
          {AddSubjectCard()}
          {BunkCard()}
        </aside>
      </main>
    );
  };

  return (
    <div className="new-dashboard">
      <aside className="sidebar">
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => handleMenuClick(item.name)}
            >
              {item.icon} {item.name}
            </button>
          ))}
        </div>

        <div className="sidebar-card">
          <div className="side-card-icon">75%</div>

          <h4>Attendance Goal</h4>

          <p>Keep your attendance above 75% and avoid shortage warnings.</p>

          <div className="side-progress-box">
            <span>Overall</span>
            <strong>{overview.overallAttendance}%</strong>
          </div>

          <button onClick={() => handleMenuClick("Reports")}>
            View Report
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">✓</div>
            <h2>75Check</h2>
            <span>Smart Attendance Tracker</span>
          </div>

          <div className="profile-box">
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div>
              <h4>Hi, {user?.name || "Student"} </h4>
            </div>

            <button onClick={handleLogout} className="logout-small">
              Logout
            </button>
          </div>
        </header>

        {message && activePage !== "Dashboard" && (
          <div className="page-message">
            <div className="message-box">{message}</div>
          </div>
        )}

        {renderPageContent()}
      </section>
    </div>
  );
}

export default Dashboard;