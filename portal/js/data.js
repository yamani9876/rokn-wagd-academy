/*
 * School records saved in this browser: classes, students, grades,
 * attendance, and announcements. Writes check the signed-in role first.
 */
(function () {
  var DATA_KEY = "rw_data_v1";

  function readData() {
    try {
      var data = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
      if (!data || data.version !== 1) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  function writeData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function uid() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    var hex = "";
    for (var i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  }

  function seed() {
    var ui = window.PortalUi;
    return {
      version: 1,
      settings: {
        academyName: "أكاديمية ركن وجد",
        welcomeNote: "تعلّم • انمُ • تألّق",
        zoomLink: ""
      },
      zoomLinks: {
        teacher: ""
      },
      classes: [
        { id: "cls-3a", name: "الصف الثالث أ", teacherUsername: "teacher" },
        { id: "cls-5b", name: "الصف الخامس ب", teacherUsername: "teacher" }
      ],
      students: [
        { id: "stu-layan", name: "ليان أحمد", classId: "cls-3a", parentUsername: "parent" },
        { id: "stu-youssef", name: "يوسف أحمد", classId: "cls-5b", parentUsername: "parent" },
        { id: "stu-mira", name: "ميرا خالد", classId: "cls-3a", parentUsername: "" },
        { id: "stu-adam", name: "آدم سامي", classId: "cls-5b", parentUsername: "" }
      ],
      grades: [
        { id: uid(), studentId: "stu-layan", subject: "اللغة العربية", score: 92, updatedAt: ui.todayISO() },
        { id: uid(), studentId: "stu-layan", subject: "الرياضيات", score: 88, updatedAt: ui.todayISO() },
        { id: uid(), studentId: "stu-youssef", subject: "اللغة الإنجليزية", score: 85, updatedAt: ui.todayISO() },
        { id: uid(), studentId: "stu-youssef", subject: "العلوم", score: 90, updatedAt: ui.todayISO() }
      ],
      attendance: [
        { studentId: "stu-layan", date: ui.shiftISO(1), status: "present" },
        { studentId: "stu-layan", date: ui.shiftISO(2), status: "late" },
        { studentId: "stu-layan", date: ui.shiftISO(3), status: "present" },
        { studentId: "stu-youssef", date: ui.shiftISO(1), status: "present" },
        { studentId: "stu-youssef", date: ui.shiftISO(2), status: "absent" },
        { studentId: "stu-youssef", date: ui.shiftISO(3), status: "present" }
      ],
      announcements: [
        {
          id: uid(),
          title: "أهلاً بكم في البوابة",
          body: "يمكن للمعلم رصد الدرجات والحضور، ولولي الأمر متابعة التقارير من هنا.",
          audience: "all",
          date: ui.todayISO()
        },
        {
          id: uid(),
          title: "تقارير الأبناء",
          body: "تقارير الحضور والدرجات للأبناء المرتبطين بالحساب ظاهرة في بوابة ولي الأمر.",
          audience: "parents",
          date: ui.todayISO()
        }
      ],
      schedule: [
        { id: "sch-1", classId: "cls-3a", time: "08:00", subject: "اللغة العربية" },
        { id: "sch-2", classId: "cls-5b", time: "09:00", subject: "الرياضيات" },
        { id: "sch-3", classId: "cls-3a", time: "10:30", subject: "العلوم" },
        { id: "sch-4", classId: "cls-5b", time: "12:00", subject: "اللغة الإنجليزية" }
      ]
    };
  }

  function ensure() {
    if (!readData()) writeData(seed());
  }

  function actor(roles) {
    var user = window.PortalAuth.currentUser();
    if (!user || roles.indexOf(user.role) === -1) return null;
    return user;
  }

  function settings() {
    var data = readData();
    return data ? clone(data.settings) : { academyName: "أكاديمية ركن وجد", welcomeNote: "" };
  }

  function teacherClassIds(username) {
    var data = readData();
    return data.classes.filter(function (item) {
      return item.teacherUsername === username;
    }).map(function (item) { return item.id; });
  }

  function canTouchStudent(user, student) {
    if (!student) return false;
    if (user.role === "admin") return true;
    if (user.role === "teacher") return teacherClassIds(user.username).indexOf(student.classId) !== -1;
    if (user.role === "parent") return student.parentUsername === user.username;
    return false;
  }

  function studentsFor(user) {
    var data = readData();
    return data.students.filter(function (student) { return canTouchStudent(user, student); });
  }

  function snapshotFor(user) {
    var data = readData();
    if (!data || !user) return null;
    var students = studentsFor(user);
    var ids = students.map(function (student) { return student.id; });
    var classIds = user.role === "admin"
      ? data.classes.map(function (item) { return item.id; })
      : students.map(function (student) { return student.classId; }).concat(teacherClassIds(user.username));
    return {
      settings: clone(data.settings),
      classes: data.classes.filter(function (item) { return classIds.indexOf(item.id) !== -1; }).map(clone),
      students: students.map(clone),
      grades: data.grades.filter(function (item) { return ids.indexOf(item.studentId) !== -1; }).map(clone),
      attendance: data.attendance.filter(function (item) { return ids.indexOf(item.studentId) !== -1; }).map(clone),
      announcements: data.announcements.filter(function (item) {
        if (user.role === "admin") return true;
        if (item.audience === "all") return true;
        if (user.role === "teacher") return item.audience === "teachers";
        return item.audience === "parents";
      }).map(clone),
      schedule: data.schedule.filter(function (item) {
        if (user.role === "admin") return true;
        return teacherClassIds(user.username).indexOf(item.classId) !== -1;
      }).map(clone),
      zoomLink: getZoomLink(user ? user.username : "")
    };
  }

  function cleanText(value, max) {
    return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
  }

  function addClass(name, teacherUsername) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var title = cleanText(name, 40);
    if (title.length < 2) return { ok: false, message: "اكتب اسم الفصل." };
    if (!window.PortalAuth.isActiveRole(teacherUsername, "teacher")) {
      return { ok: false, message: "اختر معلماً نشطاً لهذا الفصل." };
    }
    var data = readData();
    data.classes.push({ id: uid(), name: title, teacherUsername: teacherUsername });
    writeData(data);
    return { ok: true, message: "تمت إضافة الفصل." };
  }

  function assignTeacher(classId, teacherUsername) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    if (!window.PortalAuth.isActiveRole(teacherUsername, "teacher")) {
      return { ok: false, message: "اختر معلماً نشطاً." };
    }
    var data = readData();
    var item = data.classes.find(function (entry) { return entry.id === classId; });
    if (!item) return { ok: false, message: "الفصل غير موجود." };
    item.teacherUsername = teacherUsername;
    writeData(data);
    return { ok: true, message: "تم تحديث معلم الفصل." };
  }

  function deleteClass(classId) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var data = readData();
    if (data.students.some(function (student) { return student.classId === classId; })) {
      return { ok: false, message: "انقل الطلاب أو احذفهم قبل حذف الفصل." };
    }
    data.classes = data.classes.filter(function (item) { return item.id !== classId; });
    data.schedule = data.schedule.filter(function (item) { return item.classId !== classId; });
    writeData(data);
    return { ok: true, message: "تم حذف الفصل." };
  }

  function moneyValue(value) {
    if (value == null || String(value).trim() === "") return 0;
    var amount = Number(value);
    if (!isFinite(amount) || amount < 0) return null;
    return Math.round(amount * 100) / 100;
  }

  function remainingFees(fees, paid) {
    var total = moneyValue(fees);
    var paidAmount = moneyValue(paid);
    return Math.max(0, Math.round(((total == null ? 0 : total) - (paidAmount == null ? 0 : paidAmount)) * 100) / 100);
  }

  function dateValue(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    return text;
  }

  function addStudent(fields) {
    if (!actor(["admin", "supervisor"])) return { ok: false, message: "إضافة الطلاب متاحة للمدير أو المشرف فقط." };
    var name = cleanText(fields.name, 60);
    if (name.length < 2) return { ok: false, message: "اكتب اسم الطالب." };
    var phone = cleanText(fields.phone, 30);
    if (phone.length < 6) return { ok: false, message: "اكتب رقم هاتف صالحاً." };
    var startDate = dateValue(fields.startDate);
    var endDate = dateValue(fields.endDate || fields.renewalDate);
    if (startDate === null || endDate === null || !startDate || !endDate) return { ok: false, message: "حدد تاريخ البدء وتاريخ الانتهاء / التجديد." };
    if (endDate < startDate) return { ok: false, message: "تاريخ الانتهاء يجب أن يكون في تاريخ البدء أو بعده." };
    var fees = moneyValue(fields.fees);
    var paidAmount = moneyValue(fields.paidAmount);
    if (fees === null || paidAmount === null) return { ok: false, message: "أدخل الرسوم والمبلغ المدفوع كأرقام صحيحة." };
    var data = readData();
    if (!data.classes.some(function (item) { return item.id === fields.classId; })) {
      return { ok: false, message: "اختر فصلاً موجوداً." };
    }
    var parentUsername = fields.parentUsername || "";
    if (parentUsername && !window.PortalAuth.isActiveRole(parentUsername, "parent")) {
      return { ok: false, message: "اختر ولي أمر نشطاً، أو اترك الحقل دون ربط." };
    }
    data.students.push({
      id: uid(),
      name: name,
      classId: fields.classId,
      parentUsername: parentUsername,
      phone: phone,
      startDate: startDate,
      endDate: endDate,
      renewalDate: endDate,
      fees: fees,
      paidAmount: paidAmount,
      remainingAmount: remainingFees(fees, paidAmount)
    });
    writeData(data);
    return { ok: true, message: "تمت إضافة الطالب." };
  }

  function updateStudent(studentId, fields) {
    if (!actor(["admin", "supervisor"])) return { ok: false, message: "تعديل الطلاب متاح للمدير أو المشرف فقط." };
    var name = cleanText(fields.name, 60);
    if (name.length < 2) return { ok: false, message: "اكتب اسم الطالب." };
    var phone = cleanText(fields.phone, 30);
    if (phone.length < 6) return { ok: false, message: "اكتب رقم هاتف صالحاً." };
    var startDate = dateValue(fields.startDate);
    var endDate = dateValue(fields.endDate || fields.renewalDate);
    if (startDate === null || endDate === null || !startDate || !endDate) return { ok: false, message: "حدد تاريخ البدء وتاريخ الانتهاء / التجديد." };
    if (endDate < startDate) return { ok: false, message: "تاريخ الانتهاء يجب أن يكون في تاريخ البدء أو بعده." };
    var fees = moneyValue(fields.fees);
    var paidAmount = moneyValue(fields.paidAmount);
    if (fees === null || paidAmount === null) return { ok: false, message: "أدخل الرسوم والمبلغ المدفوع كأرقام صحيحة." };
    var data = readData();
    if (!data.classes.some(function (item) { return item.id === fields.classId; })) {
      return { ok: false, message: "اختر فصلاً موجوداً." };
    }
    var parentUsername = fields.parentUsername || "";
    if (parentUsername && !window.PortalAuth.isActiveRole(parentUsername, "parent")) {
      return { ok: false, message: "اختر ولي أمر نشطاً، أو اترك الحقل دون ربط." };
    }
    var student = data.students.find(function (item) { return item.id === studentId; });
    if (!student) return { ok: false, message: "الطالب غير موجود." };
    student.name = name;
    student.phone = phone;
    student.classId = fields.classId;
    student.parentUsername = parentUsername;
    student.startDate = startDate;
    student.endDate = endDate;
    student.renewalDate = endDate;
    student.fees = fees;
    student.paidAmount = paidAmount;
    student.remainingAmount = remainingFees(fees, paidAmount);
    writeData(data);
    return { ok: true, message: "تم حفظ التعديلات." };
  }

  function linkParent(studentId, parentUsername) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    if (parentUsername && !window.PortalAuth.isActiveRole(parentUsername, "parent")) {
      return { ok: false, message: "اختر ولي أمر نشطاً." };
    }
    var data = readData();
    var student = data.students.find(function (item) { return item.id === studentId; });
    if (!student) return { ok: false, message: "الطالب غير موجود." };
    student.parentUsername = parentUsername || "";
    writeData(data);
    return { ok: true, message: "تم تحديث ربط ولي الأمر." };
  }

  function deleteStudent(studentId) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var data = readData();
    data.students = data.students.filter(function (item) { return item.id !== studentId; });
    data.grades = data.grades.filter(function (item) { return item.studentId !== studentId; });
    data.attendance = data.attendance.filter(function (item) { return item.studentId !== studentId; });
    writeData(data);
    return { ok: true, message: "تم حذف الطالب وسجلاته." };
  }

  function saveGrade(studentId, subject, score) {
    var user = actor(["teacher"]);
    if (!user) return { ok: false, message: "رصد الدرجات متاح للمعلم فقط." };
    var data = readData();
    var student = data.students.find(function (item) { return item.id === studentId; });
    if (!canTouchStudent(user, student)) return { ok: false, message: "هذا الطالب خارج فصولك." };
    if (window.PortalUi.SUBJECTS.indexOf(subject) === -1) return { ok: false, message: "اختر مادة من القائمة." };
    var value = Number(score);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      return { ok: false, message: "الدرجة رقم صحيح من 0 إلى 100." };
    }
    var existing = data.grades.find(function (item) {
      return item.studentId === studentId && item.subject === subject;
    });
    if (existing) {
      existing.score = value;
      existing.updatedAt = window.PortalUi.todayISO();
    } else {
      data.grades.push({
        id: uid(),
        studentId: studentId,
        subject: subject,
        score: value,
        updatedAt: window.PortalUi.todayISO()
      });
    }
    writeData(data);
    return { ok: true, message: "تم حفظ الدرجة." };
  }

  function markAttendance(studentId, status) {
    var user = actor(["teacher"]);
    if (!user) return { ok: false, message: "تسجيل الحضور متاح للمعلم فقط." };
    if (["present", "absent", "late"].indexOf(status) === -1) {
      return { ok: false, message: "اختر حالة حضور صحيحة." };
    }
    var data = readData();
    var student = data.students.find(function (item) { return item.id === studentId; });
    if (!canTouchStudent(user, student)) return { ok: false, message: "هذا الطالب خارج فصولك." };
    var date = window.PortalUi.todayISO();
    var existing = data.attendance.find(function (item) {
      return item.studentId === studentId && item.date === date;
    });
    if (existing) existing.status = status;
    else data.attendance.push({ studentId: studentId, date: date, status: status });
    writeData(data);
    return { ok: true, message: "تم حفظ حضور اليوم." };
  }

  function addAnnouncement(fields) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var title = cleanText(fields.title, 80);
    var body = cleanText(fields.body, 500);
    var audience = ["all", "teachers", "parents"].indexOf(fields.audience) === -1 ? "" : fields.audience;
    if (title.length < 2 || body.length < 2) return { ok: false, message: "اكتب عنوان الإعلان ونصه." };
    if (!audience) return { ok: false, message: "اختر جهة الإعلان." };
    var data = readData();
    data.announcements.unshift({
      id: uid(),
      title: title,
      body: body,
      audience: audience,
      date: window.PortalUi.todayISO()
    });
    writeData(data);
    return { ok: true, message: "تم نشر الإعلان." };
  }

  function deleteAnnouncement(id) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var data = readData();
    data.announcements = data.announcements.filter(function (item) { return item.id !== id; });
    writeData(data);
    return { ok: true, message: "تم حذف الإعلان." };
  }

  function forgetUser(username) {
    var data = readData();
    if (!data || !username) return;
    data.classes.forEach(function (item) {
      if (item.teacherUsername === username) item.teacherUsername = "";
    });
    data.students.forEach(function (item) {
      if (item.parentUsername === username) item.parentUsername = "";
    });
    writeData(data);
  }

  function updateSettings(fields) {
    if (!actor(["admin"])) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var academyName = cleanText(fields.academyName, 40);
    var welcomeNote = cleanText(fields.welcomeNote, 80);
    if (academyName.length < 2) return { ok: false, message: "اكتب اسم الأكاديمية." };
    var data = readData();
    data.settings.academyName = academyName;
    data.settings.welcomeNote = welcomeNote;
    writeData(data);
    return { ok: true, message: "تم حفظ الإعدادات." };
  }

  function getZoomLink(username) {
    try {
      if (username) {
        var specific = localStorage.getItem("rw_zoom_link_" + username);
        if (specific && specific.trim()) return specific.trim();
      }
      var direct = localStorage.getItem("rw_zoom_link");
      if (direct && direct.trim()) return direct.trim();
    } catch (e) {}

    var data = readData();
    if (data) {
      if (username && data.zoomLinks && data.zoomLinks[username] && data.zoomLinks[username].trim()) {
        return data.zoomLinks[username].trim();
      }
      if (data.settings && data.settings.zoomLink && data.settings.zoomLink.trim()) {
        return data.settings.zoomLink.trim();
      }
    }
    return "";
  }

  function saveZoomLink(link, username) {
    var user = actor(["teacher", "admin"]);
    if (!user) return { ok: false, message: "حفظ رابط الحصة متاح للمعلم أو المدير فقط." };
    var cleanLink = String(link || "").trim();
    if (!cleanLink) {
      return { ok: false, message: "يرجى إدخال رابط Zoom صالح." };
    }
    if (!/^https?:\/\//i.test(cleanLink)) {
      cleanLink = "https://" + cleanLink;
    }
    var data = readData();
    if (!data) data = seed();
    if (!data.zoomLinks) data.zoomLinks = {};
    var teacherKey = username || user.username || "teacher";
    data.zoomLinks[teacherKey] = cleanLink;
    if (!data.settings) data.settings = {};
    data.settings.zoomLink = cleanLink;
    writeData(data);
    try {
      localStorage.setItem("rw_zoom_link", cleanLink);
      localStorage.setItem("rw_zoom_link_" + teacherKey, cleanLink);
    } catch (e) {}
    return { ok: true, message: "تم حفظ رابط زووم بنجاح ✓", zoomLink: cleanLink };
  }

  window.PortalData = {
    ensure: ensure,
    settings: settings,
    snapshotFor: snapshotFor,
    addClass: addClass,
    assignTeacher: assignTeacher,
    deleteClass: deleteClass,
    addStudent: addStudent,
    updateStudent: updateStudent,
    linkParent: linkParent,
    deleteStudent: deleteStudent,
    saveGrade: saveGrade,
    markAttendance: markAttendance,
    addAnnouncement: addAnnouncement,
    deleteAnnouncement: deleteAnnouncement,
    updateSettings: updateSettings,
    forgetUser: forgetUser,
    getZoomLink: getZoomLink,
    saveZoomLink: saveZoomLink
  };
})();
