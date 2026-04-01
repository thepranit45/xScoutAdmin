package com.xscout.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.xscout.app.data.model.Alert
import com.xscout.app.data.model.AlertType
import com.xscout.app.data.model.Biometrics
import com.xscout.app.data.model.DashboardStats
import com.xscout.app.data.model.StudentSession
import com.xscout.app.data.model.SuspicionLevel
import com.xscout.app.data.model.TechDetails
import com.xscout.app.data.model.DirectoryItem
import com.xscout.app.data.model.SessionSnapshot
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data class Success(val uid: String) : AuthResult()
    data class Error(val message: String) : AuthResult()
}

// ─── Local admin credentials (offline auth — no network needed) ──────────────
private object AdminCredentials {
    // Add more admins here as needed
    val accounts = mapOf(
        "admin@xscout.com"    to "xscout@123",
        "pranit@xscout.com"   to "pranit@123",
        "admin@xscout.local"  to "admin123",
        "admin"               to "admin123"
    )
}

private const val PREFS_NAME  = "xscout_auth"
private const val KEY_EMAIL   = "logged_in_email"
private const val KEY_LOGGED  = "is_logged_in"

@Singleton
class XScoutRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val api: com.xscout.app.data.api.XScoutApiService
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ─── Offline Authentication ───────────────────────────────────────────────
    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_LOGGED, false)

    fun getCurrentUserEmail(): String = prefs.getString(KEY_EMAIL, "") ?: ""

    suspend fun signIn(email: String, password: String): AuthResult {
        val trimmedEmail = email.trim().lowercase()
        val storedPass = AdminCredentials.accounts.entries.firstOrNull { (k, _) ->
            k.lowercase() == trimmedEmail
        }?.value

        return if (storedPass != null && storedPass == password) {
            try {
                // Background auth to satisfy Firestore Rules
                if (auth.currentUser == null) {
                    auth.signInAnonymously().await()
                }
                
                prefs.edit()
                    .putBoolean(KEY_LOGGED, true)
                    .putString(KEY_EMAIL, email.trim())
                    .apply()
                Log.d("XScoutRepo", "Local auth success: $email")
                AuthResult.Success(email)
            } catch (e: Exception) {
                Log.e("XScoutRepo", "Firebase Auth Fail", e)
                AuthResult.Error("Firebase Auth Failed: ${e.message}")
            }
        } else {
            Log.w("XScoutRepo", "Local auth failed for: $email")
            AuthResult.Error("Invalid email or password")
        }
    }

    fun signOut() {
        prefs.edit()
            .putBoolean(KEY_LOGGED, false)
            .putString(KEY_EMAIL, "")
            .apply()
    }

    // ─── Live Sessions ────────────────────────────────────────────────────────
    fun observeActiveSessions(): Flow<List<StudentSession>> = kotlinx.coroutines.flow.flow {
        while (true) {
            try {
                val response = api.getTelemetryData()
                if (response.status == "success") {
                    val sessions = response.data.map { mapDocToSession(it["id"] as? String ?: "nexus", it) }
                    emit(sessions.filter { it.isActive })
                }
            } catch (e: Exception) {
                Log.e("XScoutRepo", "Poll Active Sessions Fail: ${e.message}")
            }
            kotlinx.coroutines.delay(5000)
        }
    }

    fun observeAllSessions(): Flow<List<StudentSession>> = kotlinx.coroutines.flow.flow {
        while (true) {
            try {
                val response = api.getTelemetryData()
                if (response.status == "success") {
                    val sessions = response.data.map { mapDocToSession(it["id"] as? String ?: "nexus", it) }
                    emit(sessions)
                }
            } catch (e: Exception) {
                Log.e("XScoutRepo", "Poll All Sessions Fail: ${e.message}")
            }
            kotlinx.coroutines.delay(5000)
        }
    }


    suspend fun getSession(sessionId: String): StudentSession? {
        return try {
            val doc = firestore.collection("reports").document(sessionId).get().await()
            mapDocToSession(doc.id, doc.data ?: emptyMap())
        } catch (e: Exception) {
            Log.e("XScoutRepo", "getSession error", e)
            null
        }
    }

    // ─── Alerts ───────────────────────────────────────────────────────────────
    fun observeAlerts(): Flow<List<Alert>> = callbackFlow {
        val listener = firestore.collection("alerts")
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { trySend(emptyList()); return@addSnapshotListener }
                val alerts = snapshot?.documents?.mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    Alert(
                        id          = doc.id,
                        sessionId   = data["sessionId"] as? String ?: "",
                        studentName = data["studentName"] as? String ?: "Unknown",
                        message     = data["message"] as? String ?: "",
                        type        = when (data["type"] as? String) {
                            "WARNING"  -> AlertType.WARNING
                            "DANGER"   -> AlertType.DANGER
                            "CRITICAL" -> AlertType.CRITICAL
                            else       -> AlertType.INFO
                        },
                        timestamp   = (data["timestamp"] as? Long) ?: 0L,
                        isRead      = data["isRead"] as? Boolean ?: false
                    )
                } ?: emptyList()
                trySend(alerts)
            }
        awaitClose { listener.remove() }
    }

    fun markAlertRead(alertId: String) {
        firestore.collection("alerts").document(alertId)
            .update("isRead", true)
            .addOnFailureListener { Log.e("XScoutRepo", "markAlertRead", it) }
    }

    // ─── Student Authorization ────────────────────────────────────────────────
    suspend fun addAuthorizedStudent(studentId: String, name: String, notes: String): Boolean {
        return try {
            val data = mapOf(
                "studentId"   to studentId.trim(),
                "studentName" to name.trim(),
                "description" to notes.trim(),
                "isActive"    to true,
                "createdAt"   to System.currentTimeMillis()
            )
            withTimeout(10000L) {
                firestore.collection("authorized_students").document(studentId.trim()).set(data).await()
            }
            true
        } catch (e: Exception) {
            Log.e("XScoutRepo", "addAuthorizedStudent error: ", e)
            false
        }
    }

    fun observeAuthorizedStudents(): Flow<List<Map<String, Any>>> = kotlinx.coroutines.flow.flow {
        while (true) {
            try {
                val response = api.getAuthorizedStudents()
                if (response.success) {
                    val users = response.users.map { u ->
                        mapOf(
                            "studentId"   to u.student_id,
                            "studentName" to (u.student_id), // Use ID as name if name not available in list
                            "description" to (u.description ?: ""),
                            "isActive"    to u.is_active,
                            "isLocal"     to true
                        )
                    }
                    emit(users)
                }
            } catch (e: Exception) {
                Log.e("XScoutRepo", "Poll Students Fail: ${e.message}")
            }
            kotlinx.coroutines.delay(5000)
        }
    }


    // ─── Dashboard Stats ──────────────────────────────────────────────────────
    fun observeDashboardStats(): Flow<DashboardStats> = callbackFlow {
        val listener = firestore.collection("reports")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { trySend(DashboardStats()); return@addSnapshotListener }
                val sessions = snapshot?.documents?.mapNotNull { doc ->
                    mapDocToSession(doc.id, doc.data ?: emptyMap())
                } ?: emptyList()
                val active   = sessions.count { it.isActive }
                val highRisk = sessions.count {
                    it.suspicionLevel == SuspicionLevel.HIGH ||
                    it.suspicionLevel == SuspicionLevel.CRITICAL
                }
                val avgAi = if (sessions.isNotEmpty())
                    sessions.map { it.aiProbability }.average().toFloat() else 0f
                trySend(
                    DashboardStats(
                        activeSessions = active,
                        totalStudents  = sessions.map { it.studentId }.distinct().size,
                        highRiskCount  = highRisk,
                        avgAiScore     = avgAi,
                        unreadAlerts   = 0
                    )
                )
            }
        awaitClose { listener.remove() }
    }

    suspend fun getSnapshotHistory(sessionId: String): List<SessionSnapshot> {
        return try {
            val snapshot = firestore.collection("reports")
                .document(sessionId)
                .collection("history")
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()
            
            snapshot.documents.map { doc ->
                val data = doc.data ?: emptyMap<String, Any>()
                SessionSnapshot(
                    timestamp = (data["timestamp"] as? Number)?.toLong() ?: 0L,
                    file = data["file"] as? String,
                    code = data["code"] as? String,
                    aiScore = (data["ai_score"] as? Number)?.toFloat() ?: 0f
                )
            }
        } catch (e: Exception) {
            Log.e("XScoutRepo", "getSnapshotHistory error", e)
            emptyList()
        }
    }

    // ─── Mapping Helper ───────────────────────────────────────────────────────
    @Suppress("UNCHECKED_CAST")
    private fun mapDocToSession(id: String, data: Map<String, Any>): StudentSession {
        val aiScore = when (val raw = data["ai"]) {
            is Number    -> raw.toFloat()
            is Map<*, *> -> (raw["probability"] as? Number)?.toFloat() ?: 0f
            else         -> 0f
        }
        val behaviorData = data["behavior"] as? Map<String, Any> ?: emptyMap()
        val biometrics   = Biometrics(
            wpm           = (behaviorData["wpm"] as? Number)?.toFloat() ?: 0f,
            backspaceRate = (behaviorData["backspaceRate"] as? Number)?.toFloat() ?: 0f,
            pasteEvents   = (behaviorData["pasteEvents"] as? Number)?.toInt() ?: 0,
            idleTime      = (behaviorData["idleTime"] as? Number)?.toLong() ?: 0L
        )

        // Parse Tech Stack
        val techMap = data["tech"] as? Map<String, Any>
        val techDetails = if (techMap != null) {
            val meta = techMap["meta"] as? Map<String, Any> ?: emptyMap()
            val cats = techMap["categories"] as? Map<String, List<String>> ?: emptyMap()
            TechDetails(
                author = meta["author"] as? String ?: "Unknown",
                created = meta["created"] as? String ?: "Unknown",
                repository = meta["repository"] as? String,
                categories = cats
            )
        } else null

        // Parse Project Structure (Recursive)
        val projectMap = data["project"] as? Map<String, Any>
        val projectStructure = if (projectMap != null) mapToDirectoryItem(projectMap) else null

        val suspicion = when {
            aiScore >= 80 -> SuspicionLevel.CRITICAL
            aiScore >= 60 -> SuspicionLevel.HIGH
            aiScore >= 35 -> SuspicionLevel.MEDIUM
            else          -> SuspicionLevel.LOW
        }
        return StudentSession(
            id             = id,
            studentId      = data["studentId"] as? String ?: "",
            studentName    = data["studentName"] as? String ?: "Unknown Student",
            email          = data["email"] as? String ?: "",
            timestamp      = (data["timestamp"] as? Number)?.toLong() ?: 0L,
            duration       = (data["duration"] as? Number)?.toLong() ?: 0L,
            aiProbability  = aiScore,
            behaviorScore  = (data["behaviorScore"] as? Number)?.toFloat() ?: 0f,
            stack          = data["stack"] as? String ?: "Unknown",
            suspicionLevel = suspicion,
            titleHistory   = (data["titleHistory"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            biometrics     = biometrics,
            isActive       = data["isActive"] as? Boolean ?: false,
            techDetails    = techDetails,
            projectStructure = projectStructure
        )
    }

    private fun mapToDirectoryItem(data: Map<String, Any>): com.xscout.app.data.model.DirectoryItem {
        return com.xscout.app.data.model.DirectoryItem(
            name = data["name"] as? String ?: "root",
            type = data["type"] as? String ?: "file",
            path = data["path"] as? String ?: "",
            children = (data["children"] as? List<Map<String, Any>>)?.map { mapToDirectoryItem(it) } ?: emptyList()
        )
    }
}
