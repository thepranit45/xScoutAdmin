package com.xscout.app.data.model

data class StudentSession(
    val id: String = "",
    val studentId: String = "",
    val studentName: String = "",
    val email: String = "",
    val timestamp: Long = 0L,
    val duration: Long = 0L,          // seconds
    val aiProbability: Float = 0f,    // 0–100
    val behaviorScore: Float = 0f,
    val stack: String = "",
    val suspicionLevel: SuspicionLevel = SuspicionLevel.LOW,
    val titleHistory: List<String> = emptyList(),
    val biometrics: Biometrics = Biometrics(),
    val isActive: Boolean = false,
    val techDetails: TechDetails? = null,
    val projectStructure: DirectoryItem? = null
)

data class TechDetails(
    val author: String = "Unknown",
    val created: String = "Unknown",
    val repository: String? = null,
    val categories: Map<String, List<String>> = emptyMap()
)

data class DirectoryItem(
    val name: String,
    val type: String,
    val path: String = "",
    val children: List<DirectoryItem> = emptyList()
)

data class SessionSnapshot(
    val timestamp: Long = 0L,
    val file: String? = null,
    val code: String? = null,
    val aiScore: Float = 0f
)

enum class SuspicionLevel { LOW, MEDIUM, HIGH, CRITICAL }

data class Biometrics(
    val wpm: Float = 0f,
    val backspaceRate: Float = 0f,
    val pasteEvents: Int = 0,
    val idleTime: Long = 0L
)

data class Alert(
    val id: String = "",
    val sessionId: String = "",
    val studentName: String = "",
    val message: String = "",
    val type: AlertType = AlertType.INFO,
    val timestamp: Long = 0L,
    val isRead: Boolean = false
)

enum class AlertType { INFO, WARNING, DANGER, CRITICAL }

data class AdminUser(
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val role: String = "admin"
)

data class DashboardStats(
    val activeSessions: Int = 0,
    val totalStudents: Int = 0,
    val highRiskCount: Int = 0,
    val avgAiScore: Float = 0f,
    val unreadAlerts: Int = 0
)
