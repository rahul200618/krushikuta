import { useState, useEffect } from "react";
import { 
  listStudentProfiles, 
  getUserPerformance, 
  resetStudentDevice,
  checkUserAccess,
  grantAccess,
  revokeAccess,
  listMockTests,
  changeUserPassword
} from "@/lib/exam-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Users, RefreshCw, Eye, Calendar, Phone, Mail, GraduationCap, MapPin, ShieldAlert, Trophy, Award, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { AccessManagerPanel } from "@/components/exam/AccessManagerPanel";
import { PaymentRequestsPanel } from "@/components/exam/PaymentRequestsPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentProfile {
  firebase_uid: string;
  name: string;
  email: string;
  mobile: string;
  college: string;
  district?: string;
  category?: string;
  guardian_name?: string;
  guardian_contact?: string;
  guardian_profession?: string;
  primary_device_id?: string;
  created_at: string;
}

interface Submission {
  id: number;
  test_id: number;
  score: number;
  total_questions: number;
  is_completed: boolean;
  submitted_at: string;
  is_scaled?: boolean;
  mock_tests?: {
    title: string;
    category: string;
  };
}

interface PerformanceData {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  submissions: Submission[];
}

export function UsersManagerPanel() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal / detail states
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Secondary secure credentials state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [resettingDevice, setResettingDevice] = useState(false);

  // Mock test access management states
  const [tests, setTests] = useState<any[]>([]);
  const [userAccessList, setUserAccessList] = useState<number[]>([]);
  const [selectedGrantTestId, setSelectedGrantTestId] = useState<string>("");
  const [grantingAccess, setGrantingAccess] = useState(false);

  // Password change and quick access states
  const [passwordStudent, setPasswordStudent] = useState<StudentProfile | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [accessStudent, setAccessStudent] = useState<StudentProfile | null>(null);
  const [loadingAccessList, setLoadingAccessList] = useState(false);

  const paidTests = tests.filter(t => !t.is_free && t.title !== '_SUBJECT_PLACEHOLDER_').sort((a, b) => a.id - b.id);
  const first6TestIds = paidTests.slice(0, 6).map(t => t.id);

  const handleResetDevice = async (studentId: string) => {
    setResettingDevice(true);
    try {
      await resetStudentDevice(studentId);
      toast.success("Primary device reset successfully. Student can register a new device on next login.");
      
      // Update local states
      if (selectedStudent) {
        setSelectedStudent({
          ...selectedStudent,
          primary_device_id: undefined
        });
      }
      setStudents(prev => prev.map(s => s.firebase_uid === studentId ? { ...s, primary_device_id: undefined } : s));
    } catch (err: any) {
      toast.error(err.message || "Failed to reset registered device");
    } finally {
      setResettingDevice(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchStudents();
      fetchTests();
    }
  }, [isUnlocked]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await listStudentProfiles();
      setStudents(res.profiles || []);
      if (res.error) {
        toast.warning(`Warning: ${res.error}`);
      }
    } catch {
      toast.error("Failed to load student profiles");
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await listMockTests();
      setTests(res.tests || []);
    } catch (err) {
      console.error("Failed to load mock tests list", err);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (authUsername.trim() === "admin" && authPassword === "Admin@123") {
      setIsUnlocked(true);
      toast.success("Access granted to user directory");
    } else {
      setAuthError("Invalid username or password");
      toast.error("Directory access denied");
    }
  };

  const handleViewDetails = async (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
    setPerfLoading(true);
    setPerformance(null);
    setUserAccessList([]);
    setSelectedGrantTestId("");
    try {
      const [perfRes, accessRes] = await Promise.all([
        getUserPerformance(student.firebase_uid),
        checkUserAccess(student.firebase_uid, [])
      ]);
      setPerformance(perfRes);
      setUserAccessList(accessRes.access || []);
    } catch {
      toast.error("Failed to load user performance and access data");
    } finally {
      setPerfLoading(false);
    }
  };

  const handleGrantTestAccess = async () => {
    if (!selectedStudent) return;
    if (!selectedGrantTestId) {
      toast.error("Please select a mock test to grant access");
      return;
    }
    setGrantingAccess(true);
    try {
      const testId = parseInt(selectedGrantTestId);
      await grantAccess({
        userId: selectedStudent.firebase_uid,
        testId,
        email: selectedStudent.email,
        amount: 0,
        paymentMethod: "Admin Granted"
      });
      toast.success("Mock test access granted successfully!");
      setUserAccessList(prev => [...prev, testId]);
      setSelectedGrantTestId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to grant access");
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleRevokeTestAccess = async (testId: number) => {
    if (!selectedStudent) return;
    setGrantingAccess(true);
    try {
      await revokeAccess(selectedStudent.firebase_uid, testId);
      toast.success("Mock test access revoked successfully!");
      setUserAccessList(prev => prev.filter(id => id !== testId));
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access");
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleConfirmChangePassword = async () => {
    if (!passwordStudent) return;
    if (newPasswordVal.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    setChangingPassword(true);
    try {
      await changeUserPassword(passwordStudent.firebase_uid, newPasswordVal);
      toast.success(`Password for ${passwordStudent.name} updated successfully!`);
      setPasswordStudent(null);
      setNewPasswordVal("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenQuickAccess = async (student: StudentProfile) => {
    setAccessStudent(student);
    setUserAccessList([]);
    setSelectedGrantTestId("");
    setLoadingAccessList(true);
    try {
      const res = await checkUserAccess(student.firebase_uid, []);
      setUserAccessList(res.access || []);
    } catch {
      toast.error("Failed to load user access list");
    } finally {
      setLoadingAccessList(false);
    }
  };

  const handleQuickGrantAccess = async () => {
    if (!accessStudent) return;
    if (!selectedGrantTestId) {
      toast.error("Please select a mock test to grant access");
      return;
    }
    setGrantingAccess(true);
    try {
      const testId = parseInt(selectedGrantTestId);
      await grantAccess({
        userId: accessStudent.firebase_uid,
        testId,
        email: accessStudent.email,
        amount: 0,
        paymentMethod: "Admin Granted"
      });
      toast.success("Mock test access granted successfully!");
      setUserAccessList(prev => [...prev, testId]);
      setSelectedGrantTestId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to grant access");
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleQuickRevokeAccess = async (testId: number) => {
    if (!accessStudent) return;
    setGrantingAccess(true);
    try {
      await revokeAccess(accessStudent.firebase_uid, testId);
      toast.success("Mock test access revoked successfully!");
      setUserAccessList(prev => prev.filter(id => id !== testId));
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access");
    } finally {
      setGrantingAccess(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.mobile && s.mobile.includes(query)) ||
      (s.college && s.college.toLowerCase().includes(query)) ||
      (s.district && s.district.toLowerCase().includes(query)) ||
      (s.category && s.category.toLowerCase().includes(query))
    );
  });

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 border-[#e0e8e2] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#eaf2eb] rounded-2xl flex items-center justify-center text-[#2c5f34] mx-auto mb-3 shadow-[0_4px_12px_rgba(44,95,52,0.1)]">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-[#1a3820]">Secure Directory Access</h3>
            <p className="text-xs text-[#5e7a63] mt-1">This directory contains sensitive user data. Verify admin credentials to unlock.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#5e7a63] uppercase tracking-wider block">Username</Label>
              <Input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="admin"
                className="bg-white border-[#e0e8e2] focus-visible:ring-[#2c5f34] rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#5e7a63] uppercase tracking-wider block">Password</Label>
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white border-[#e0e8e2] focus-visible:ring-[#2c5f34] rounded-xl text-sm"
                required
              />
            </div>
            {authError && <p className="text-xs text-red-500 font-medium text-center">{authError}</p>}
            <Button type="submit" className="w-full bg-[#2c5f34] hover:bg-[#1a3820] text-white rounded-xl transition-all font-semibold py-2 cursor-pointer">
              Unlock Directory
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="directory" className="space-y-6">
      <TabsList className="bg-[#eaf2eb] p-1 border border-[#e0e8e2] rounded-xl flex w-fit gap-1 mb-4">
        <TabsTrigger value="directory" className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5e7a63] hover:text-[#2c5f34] data-[state=active]:bg-white data-[state=active]:text-[#2c5f34] data-[state=active]:shadow-sm transition-all cursor-pointer">
          Users Directory
        </TabsTrigger>
        <TabsTrigger value="access" className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5e7a63] hover:text-[#2c5f34] data-[state=active]:bg-white data-[state=active]:text-[#2c5f34] data-[state=active]:shadow-sm transition-all cursor-pointer">
          Manual Grants & Log
        </TabsTrigger>
        <TabsTrigger value="payments" className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5e7a63] hover:text-[#2c5f34] data-[state=active]:bg-white data-[state=active]:text-[#2c5f34] data-[state=active]:shadow-sm transition-all cursor-pointer">
          Payments & QR Code
        </TabsTrigger>
      </TabsList>

      <TabsContent value="directory" className="space-y-6 focus-visible:outline-none">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1a3820]">Registered Users</h3>
          <p className="text-xs text-[#5e7a63]">Directory of users registered in the portal</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading} className="border-[#e0e8e2] hover:bg-[#f4f7f4] text-[#2c5f34]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3 border-[#e0e8e2] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
          <div className="w-10 h-10 rounded-xl bg-[#eaf2eb] flex items-center justify-center text-[#2c5f34]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#5e7a63] font-medium">Total Registered Users</p>
            <p className="text-2xl font-bold text-[#1a3820]">{students.length}</p>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl bg-white border-[#e0e8e2] focus-visible:ring-[#2c5f34]"
          placeholder="Search by name, email, phone, college, district, or category..."
        />
      </div>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden border-[#e0e8e2] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f7f4] text-[#5e7a63] text-xs uppercase font-bold tracking-wider border-b border-[#e0e8e2]">
              <tr>
                <th className="px-6 py-4 text-left">Student Info</th>
                <th className="px-6 py-4 text-left">Contact Info</th>
                <th className="px-6 py-4 text-left">College & District</th>
                <th className="px-6 py-4 text-left">Registration Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[#5e7a63]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-[#2c5f34] animate-spin" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#5e7a63]">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.firebase_uid} className="border-b border-[#e0e8e2]/60 hover:bg-[#f4f7f4]/45 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#1a3820] text-sm">{s.name}</div>
                      {s.category && (
                        <Badge className="mt-1 bg-[#eaf2eb] text-[#2c5f34] border-none text-[10px] uppercase font-bold tracking-wider hover:bg-[#eaf2eb]">
                          {s.category}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-1.5 text-[#2c5f34] font-medium">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {s.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-1 font-mono">
                        <Phone className="w-3.5 h-3.5 shrink-0" /> {s.mobile || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-[#1a3820] line-clamp-1">{s.college || "—"}</div>
                      <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {s.district || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {new Date(s.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Details */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(s)}
                          className="text-[#2c5f34] hover:text-[#2c5f34] hover:bg-[#eaf2eb] h-8 px-2 rounded-lg text-xs cursor-pointer"
                          title="View Details & Analytics"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Details
                        </Button>

                        {/* Give Access */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenQuickAccess(s)}
                          className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 px-2 rounded-lg text-xs cursor-pointer"
                          title="Grant / Revoke Paper Access"
                        >
                          <Award className="w-3.5 h-3.5 mr-1" /> Access
                        </Button>

                        {/* Reset Device Lock */}
                        {s.primary_device_id && s.primary_device_id !== '-' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Are you sure you want to reset the registered device for ${s.name}?`)) {
                                handleResetDevice(s.firebase_uid);
                              }
                            }}
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 h-8 px-2 rounded-lg text-xs cursor-pointer"
                            title="Reset Device Lock"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin-slow" /> Clear Dev
                          </Button>
                        ) : null}

                        {/* Change Password */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPasswordStudent(s);
                            setNewPasswordVal("");
                          }}
                          className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 h-8 px-2 rounded-lg text-xs cursor-pointer"
                          title="Change Password"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" /> PW
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Details & Performance Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-[#e0e8e2]">
          <DialogHeader className="border-b border-[#e0e8e2] pb-4">
            <DialogTitle className="text-xl font-bold text-[#1a3820]">User Profile & Analytics</DialogTitle>
            <DialogDescription className="text-[#5e7a63]">
              Review detailed registration data and performance metrics for the student.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6 pt-4">
              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4f7f4]/60 p-5 rounded-xl border border-[#e0e8e2]">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1a3820] uppercase tracking-wider">Student Profile</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Full Name</span>
                      <span className="font-semibold text-[#1a3820]">{selectedStudent.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Email Address</span>
                      <span className="font-medium text-[#2c5f34]">{selectedStudent.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Mobile Number</span>
                      <span className="font-medium text-[#1a3820] font-mono">{selectedStudent.mobile || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Institution / College</span>
                      <span className="font-medium text-[#1a3820]">{selectedStudent.college || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">District</span>
                      <span className="font-medium text-[#1a3820]">{selectedStudent.district || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Category</span>
                      <span className="font-medium text-[#1a3820]">{selectedStudent.category || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1a3820] uppercase tracking-wider">Guardian Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Guardian's Name</span>
                      <span className="font-semibold text-[#1a3820]">{selectedStudent.guardian_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Guardian's Profession</span>
                      <span className="font-medium text-[#1a3820]">{selectedStudent.guardian_profession || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Guardian's Contact</span>
                      <span className="font-medium text-[#1a3820] font-mono">{selectedStudent.guardian_contact || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#5e7a63] block">Supabase User UID</span>
                      <span className="text-[11px] font-mono text-muted-foreground block truncate" title={selectedStudent.firebase_uid}>
                        {selectedStudent.firebase_uid}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Access Control Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-[#e0e8e2]">
                {/* Left column: Device Lock */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1a3820] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Device Lock Protection
                  </h4>
                  <p className="text-xs text-[#5e7a63]">
                    Users are locked to their primary device upon login. Resetting the device allows them to register a new one.
                  </p>
                  <div className="pt-2">
                    {selectedStudent.primary_device_id && selectedStudent.primary_device_id !== '-' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5e7a63]">Status:</span>
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] hover:bg-amber-50 font-mono">
                            Locked to Browser/Session
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="w-full text-xs h-9 cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all"
                          onClick={() => handleResetDevice(selectedStudent.firebase_uid)}
                          disabled={resettingDevice}
                        >
                          {resettingDevice ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                          )}
                          Reset Registered Device
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5e7a63]">Status:</span>
                          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none text-[10px] uppercase font-bold tracking-wider">
                            No device registered yet
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column: Test Access Grants */}
                <div className="space-y-3 border-t md:border-t-0 md:border-l border-[#e0e8e2] pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-sm font-bold text-[#1a3820] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#2c5f34]" /> Paper Access Controls
                  </h4>
                  
                  {/* Grant Access Trigger */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#5e7a63]">Grant Access to a Mock Test</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={selectedGrantTestId} onValueChange={setSelectedGrantTestId}>
                          <SelectTrigger className="w-full h-9 rounded-xl bg-white border-[#e0e8e2] text-xs">
                            <SelectValue placeholder="Choose mock test..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-1">🔓 All-Access Bundle (Test ID: -1)</SelectItem>
                            <SelectItem value="-2">🔓 First 6 Paper Releases (Test ID: -2)</SelectItem>
                            {tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_').map(t => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.title} ({t.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleGrantTestAccess}
                        disabled={grantingAccess || !selectedGrantTestId}
                        className="bg-[#2c5f34] hover:bg-[#1a3820] text-white text-xs h-9 rounded-xl px-3 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      >
                        {grantingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Grant"}
                      </Button>
                    </div>
                  </div>

                  {/* Active Grants List */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-[#1a3820] block">Access Summary</span>
                    
                    {/* Bundles Status */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 text-xs ${
                        userAccessList.includes(-1) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-semibold text-[#1a3820] truncate">All-Access Bundle</div>
                        <div className="text-[10px] text-muted-foreground">Mock Test ID: -1</div>
                        {userAccessList.includes(-1) ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeTestAccess(-1)}
                            disabled={grantingAccess}
                            className="w-full text-[10px] h-6 mt-1"
                          >
                            Revoke Bundle
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              setGrantingAccess(true);
                              try {
                                await grantAccess({
                                  userId: selectedStudent.firebase_uid,
                                  testId: -1,
                                  email: selectedStudent.email,
                                  amount: 0,
                                  paymentMethod: "Admin Granted"
                                });
                                toast.success("All-Access Bundle granted!");
                                setUserAccessList(prev => [...prev, -1]);
                              } catch (e: any) {
                                toast.error(e.message || "Failed to grant");
                              } finally {
                                setGrantingAccess(false);
                              }
                            }}
                            disabled={grantingAccess}
                            className="w-full bg-[#2c5f34] text-white hover:bg-[#1a3820] text-[10px] h-6 mt-1"
                          >
                            Grant Bundle
                          </Button>
                        )}
                      </div>

                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 text-xs ${
                        userAccessList.includes(-2) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-semibold text-[#1a3820] truncate">First 6 Paper Releases</div>
                        <div className="text-[10px] text-muted-foreground">Mock Test ID: -2</div>
                        {userAccessList.includes(-2) ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeTestAccess(-2)}
                            disabled={grantingAccess}
                            className="w-full text-[10px] h-6 mt-1"
                          >
                            Revoke Bundle
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              setGrantingAccess(true);
                              try {
                                await grantAccess({
                                  userId: selectedStudent.firebase_uid,
                                  testId: -2,
                                  email: selectedStudent.email,
                                  amount: 0,
                                  paymentMethod: "Admin Granted"
                                });
                                toast.success("First 6 Paper Releases granted!");
                                setUserAccessList(prev => [...prev, -2]);
                              } catch (e: any) {
                                toast.error(e.message || "Failed to grant");
                              } finally {
                                setGrantingAccess(false);
                              }
                            }}
                            disabled={grantingAccess}
                            className="w-full bg-[#2c5f34] text-white hover:bg-[#1a3820] text-[10px] h-6 mt-1"
                          >
                            Grant Bundle
                          </Button>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-[#1a3820] block pt-2">Paper-by-Paper Status</span>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto border border-[#e0e8e2] rounded-xl p-2 bg-slate-50/50">
                      {tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_').map(t => {
                        const isFree = t.is_free;
                        const isFirst6 = !isFree && first6TestIds.includes(t.id);
                        
                        let status: 'free' | 'bundle-all' | 'bundle-6' | 'direct' | 'locked' = 'locked';
                        if (isFree) status = 'free';
                        else if (userAccessList.includes(-1)) status = 'bundle-all';
                        else if (userAccessList.includes(-2) && isFirst6) status = 'bundle-6';
                        else if (userAccessList.includes(t.id)) status = 'direct';
                        
                        return (
                          <div key={t.id} className="flex items-center justify-between p-2 bg-white border border-[#e0e8e2] rounded-lg text-xs gap-2 shadow-sm">
                            <div className="truncate flex-1">
                              <span className="font-semibold text-[#1a3820] block truncate" title={t.title}>{t.title}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{t.category}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {status === 'free' && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-bold">Free</Badge>
                              )}
                              {status === 'bundle-all' && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-bold">Unlocked (All)</Badge>
                              )}
                              {status === 'bundle-6' && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-bold">Unlocked (6 Pkgs)</Badge>
                              )}
                              {status === 'direct' && (
                                <>
                                  <Badge className="bg-green-100 text-green-800 border-none text-[9px] font-bold">Unlocked (Direct)</Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRevokeTestAccess(t.id)}
                                    disabled={grantingAccess}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-1.5 rounded text-[9px] font-bold cursor-pointer"
                                  >
                                    Revoke
                                  </Button>
                                </>
                              )}
                              {status === 'locked' && (
                                <>
                                  <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-bold">Locked</Badge>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      setGrantingAccess(true);
                                      try {
                                        await grantAccess({
                                          userId: selectedStudent.firebase_uid,
                                          testId: t.id,
                                          email: selectedStudent.email,
                                          amount: 0,
                                          paymentMethod: "Admin Granted"
                                        });
                                        toast.success(`Unlocked ${t.title}`);
                                        setUserAccessList(prev => [...prev, t.id]);
                                      } catch (e: any) {
                                        toast.error(e.message || "Failed to unlock");
                                      } finally {
                                        setGrantingAccess(false);
                                      }
                                    }}
                                    disabled={grantingAccess}
                                    className="bg-[#2c5f34] text-white hover:bg-[#1a3820] h-6 px-1.5 rounded text-[9px] font-bold cursor-pointer"
                                  >
                                    Unlock
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-[#1a3820] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#2c5f34]" /> Mock Test Performance
                </h4>

                {perfLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 text-[#2c5f34] animate-spin" />
                    <span className="text-xs text-[#5e7a63]">Fetching mock test submissions...</span>
                  </div>
                ) : !performance || performance.submissions.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#e0e8e2] rounded-xl text-[#5e7a63] text-sm">
                    <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-[#5e7a63]" />
                    No test attempts recorded for this user yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stats Header inside modal */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#f4f7f4] border border-[#e0e8e2]/70 p-3 rounded-lg text-center">
                        <span className="text-[10px] uppercase text-[#5e7a63] font-bold block">Total Attempts</span>
                        <span className="text-lg font-bold text-[#1a3820]">{performance.totalAttempts}</span>
                      </div>
                      <div className="bg-[#f4f7f4] border border-[#e0e8e2]/70 p-3 rounded-lg text-center">
                        <span className="text-[10px] uppercase text-[#5e7a63] font-bold block">Average Score</span>
                        <span className="text-lg font-bold text-[#2c5f34]">{performance.averageScore}%</span>
                      </div>
                      <div className="bg-[#f4f7f4] border border-[#e0e8e2]/70 p-3 rounded-lg text-center">
                        <span className="text-[10px] uppercase text-[#5e7a63] font-bold block">Best Score</span>
                        <span className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1">
                          <Trophy className="w-4 h-4 shrink-0" /> {performance.bestScore}%
                        </span>
                      </div>
                    </div>

                    {/* Submissions List */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {performance.submissions.map((sub) => {
                        const maxScore = (sub.total_questions || 50) * (sub.is_scaled ? 3 : 4);
                        const percentage = maxScore > 0 ? Math.round((sub.score / maxScore) * 100) : 0;
                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-3.5 border border-[#e0e8e2] rounded-xl bg-white hover:border-[#2c5f34]/30 hover:shadow-soft transition-all"
                          >
                            <div className="space-y-1">
                              <h5 className="font-semibold text-sm text-[#1a3820]">
                                {sub.mock_tests?.title || `Mock Test #${sub.test_id}`}
                              </h5>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Badge className="bg-[#eaf2eb] hover:bg-[#eaf2eb] text-[#2c5f34] border-none text-[8px] py-0.5 px-1.5 uppercase font-bold shrink-0">
                                  {sub.mock_tests?.category || "General"}
                                </Badge>
                                <span>•</span>
                                <span>
                                  {new Date(sub.submitted_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-[#1a3820]">
                                Score: {sub.score} / {maxScore}
                              </div>
                              <div className="flex items-center gap-1 justify-end text-xs font-semibold text-[#2c5f34] mt-0.5">
                                <CheckCircle className="w-3.5 h-3.5 text-[#2c5f34] shrink-0" /> {percentage}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordStudent !== null} onOpenChange={(open) => { if (!open) setPasswordStudent(null); }}>
        <DialogContent className="max-w-md rounded-2xl border-[#e0e8e2]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a3820]">Change User Password</DialogTitle>
            <DialogDescription className="text-xs text-[#5e7a63]">
              Set a new secure password for {passwordStudent?.name} ({passwordStudent?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#5e7a63]">New Password</Label>
              <Input
                type="password"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                placeholder="Minimum 6 characters"
                className="bg-white border-[#e0e8e2] focus-visible:ring-[#2c5f34] rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setPasswordStudent(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmChangePassword}
                disabled={changingPassword || newPasswordVal.length < 6}
                className="bg-[#2c5f34] hover:bg-[#1a3820] text-white rounded-xl text-xs font-semibold px-4 cursor-pointer"
              >
                {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Access Dialog */}
      <Dialog open={accessStudent !== null} onOpenChange={(open) => { if (!open) setAccessStudent(null); }}>
        <DialogContent className="max-w-lg rounded-2xl border-[#e0e8e2]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a3820]">Manage Paper Access</DialogTitle>
            <DialogDescription className="text-xs text-[#5e7a63]">
              Quickly grant or revoke mock test access for {accessStudent?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            {/* Grant Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#5e7a63]">Grant Access to a Mock Test</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedGrantTestId} onValueChange={setSelectedGrantTestId}>
                    <SelectTrigger className="w-full h-9 rounded-xl bg-white border-[#e0e8e2] text-xs">
                      <SelectValue placeholder="Choose mock test..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">🔓 All-Access Bundle (Test ID: -1)</SelectItem>
                      <SelectItem value="-2">🔓 First 6 Paper Releases (Test ID: -2)</SelectItem>
                      {tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_').map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.title} ({t.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleQuickGrantAccess}
                  disabled={grantingAccess || !selectedGrantTestId}
                  className="bg-[#2c5f34] hover:bg-[#1a3820] text-white text-xs h-9 rounded-xl px-3 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  {grantingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Grant"}
                </Button>
              </div>
            </div>

            {/* Active List Section */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#1a3820] block">Access Summary</span>
              
              {/* Bundles Status */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 text-xs ${
                  userAccessList.includes(-1) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="font-semibold text-[#1a3820] truncate">All-Access Bundle</div>
                  <div className="text-[10px] text-muted-foreground">Mock Test ID: -1</div>
                  {userAccessList.includes(-1) ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQuickRevokeAccess(-1)}
                      disabled={grantingAccess}
                      className="w-full text-[10px] h-6 mt-1"
                    >
                      Revoke Bundle
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setGrantingAccess(true);
                        try {
                          await grantAccess({
                            userId: accessStudent.firebase_uid,
                            testId: -1,
                            email: accessStudent.email,
                            amount: 0,
                            paymentMethod: "Admin Granted"
                          });
                          toast.success("All-Access Bundle granted!");
                          setUserAccessList(prev => [...prev, -1]);
                        } catch (e: any) {
                          toast.error(e.message || "Failed to grant");
                        } finally {
                          setGrantingAccess(false);
                        }
                      }}
                      disabled={grantingAccess}
                      className="w-full bg-[#2c5f34] text-white hover:bg-[#1a3820] text-[10px] h-6 mt-1"
                    >
                      Grant Bundle
                    </Button>
                  )}
                </div>

                <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 text-xs ${
                  userAccessList.includes(-2) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="font-semibold text-[#1a3820] truncate">First 6 Paper Releases</div>
                  <div className="text-[10px] text-muted-foreground">Mock Test ID: -2</div>
                  {userAccessList.includes(-2) ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQuickRevokeAccess(-2)}
                      disabled={grantingAccess}
                      className="w-full text-[10px] h-6 mt-1"
                    >
                      Revoke Bundle
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setGrantingAccess(true);
                        try {
                          await grantAccess({
                            userId: accessStudent.firebase_uid,
                            testId: -2,
                            email: accessStudent.email,
                            amount: 0,
                            paymentMethod: "Admin Granted"
                          });
                          toast.success("First 6 Paper Releases granted!");
                          setUserAccessList(prev => [...prev, -2]);
                        } catch (e: any) {
                          toast.error(e.message || "Failed to grant");
                        } finally {
                          setGrantingAccess(false);
                        }
                      }}
                      disabled={grantingAccess}
                      className="w-full bg-[#2c5f34] text-white hover:bg-[#1a3820] text-[10px] h-6 mt-1"
                    >
                      Grant Bundle
                    </Button>
                  )}
                </div>
              </div>

              <span className="text-xs font-bold text-[#1a3820] block pt-2">Paper-by-Paper Status</span>
              {loadingAccessList ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#2c5f34] animate-spin" /></div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto border border-[#e0e8e2] rounded-xl p-2 bg-slate-50/50">
                  {tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_').map(t => {
                    const isFree = t.is_free;
                    const isFirst6 = !isFree && first6TestIds.includes(t.id);
                    
                    let status: 'free' | 'bundle-all' | 'bundle-6' | 'direct' | 'locked' = 'locked';
                    if (isFree) status = 'free';
                    else if (userAccessList.includes(-1)) status = 'bundle-all';
                    else if (userAccessList.includes(-2) && isFirst6) status = 'bundle-6';
                    else if (userAccessList.includes(t.id)) status = 'direct';
                    
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-white border border-[#e0e8e2] rounded-lg text-xs gap-2 shadow-sm">
                        <div className="truncate flex-1">
                          <span className="font-semibold text-[#1a3820] block truncate" title={t.title}>{t.title}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{t.category}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {status === 'free' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-bold">Free</Badge>
                          )}
                          {status === 'bundle-all' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-bold">Unlocked (All)</Badge>
                          )}
                          {status === 'bundle-6' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-bold">Unlocked (6 Pkgs)</Badge>
                          )}
                          {status === 'direct' && (
                            <>
                              <Badge className="bg-green-100 text-green-800 border-none text-[9px] font-bold">Unlocked (Direct)</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuickRevokeAccess(t.id)}
                                disabled={grantingAccess}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-1.5 rounded text-[9px] font-bold cursor-pointer"
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                          {status === 'locked' && (
                            <>
                              <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-bold">Locked</Badge>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setGrantingAccess(true);
                                  try {
                                    await grantAccess({
                                      userId: accessStudent.firebase_uid,
                                      testId: t.id,
                                      email: accessStudent.email,
                                      amount: 0,
                                      paymentMethod: "Admin Granted"
                                    });
                                    toast.success(`Unlocked ${t.title}`);
                                    setUserAccessList(prev => [...prev, t.id]);
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to unlock");
                                  } finally {
                                    setGrantingAccess(false);
                                  }
                                }}
                                disabled={grantingAccess}
                                className="bg-[#2c5f34] text-white hover:bg-[#1a3820] h-6 px-1.5 rounded text-[9px] font-bold cursor-pointer"
                              >
                                Unlock
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </TabsContent>

      <TabsContent value="access" className="focus-visible:outline-none">
        <AccessManagerPanel />
      </TabsContent>

      <TabsContent value="payments" className="focus-visible:outline-none">
        <PaymentRequestsPanel />
      </TabsContent>
    </Tabs>
  );
}
