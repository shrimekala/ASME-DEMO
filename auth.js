// 1. Initialize the Supabase Client
// Replace these with your actual Project URL and Anon Key
const supabaseUrl = "https://eupmijeyqsdiaetjbebt.supabase.co"; // Correct URL format
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cG1pamV5cXNkaWFldGpiZWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI4NTAzMDgsImV4cCI6MjAyODQyNjMwOH0.vL-a9z53Ua_2Jz2y3u4Y5m3I8tW0-M-s5T_aF2j5vFM"; // Replace with your actual anon key
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Grab DOM elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const errorMessageDiv = document.getElementById("errorMessage");
const loginBtn = document.getElementById("loginBtn");

// 3. Listen for form submission
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent page from refreshing

    // Reset UI states
    errorMessageDiv.classList.add("d-none");
    loginBtn.textContent = "Logging in...";
    loginBtn.disabled = true;

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      // 4. Authenticate the user
      const { data: authData, error: authError } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (authError) throw authError;

      // 5. Query the profiles table to get the user's role
      const userId = authData.user.id;

      const { data: profileData, error: profileError } = await supabaseClient
        .from("profiles")
        .select("role, dues_paid") //
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // 6. Route the user based on their role and membership status
      if (
        profileData.role === "officers" ||
        (profileData.role === "members" && profileData.dues_paid === true)
      ) {
        // Officers and verified, paid members get access to the main dashboard
        window.location.href = "./dashboard.html";
      } else {
        // Unpaid members (or newly created accounts) are sent to the pre-dashboard sign-up page
        window.location.href = "./pre-dashboard.html";
      }
    } catch (error) {
      // Handle errors (e.g., wrong password, network issues)
      errorMessageDiv.textContent = error.message;
      errorMessageDiv.classList.remove("d-none");
    } finally {
      // Reset button state regardless of success or failure
      loginBtn.textContent = "Log In";
      loginBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------
// --- SIGNUP LOGIC ---
// ---------------------------------------------------------
const signupForm = document.getElementById("signupForm");

// The 'if' statement ensures this code only runs if the signup form actually exists on the page
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Grab the values using the exact IDs from your HTML
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    // --- FRONTEND EMAIL RESTRICTION CHECK ---
    const lowerEmail = email.toLowerCase();
    if (
      !lowerEmail.endsWith("@uh.edu") &&
      !lowerEmail.endsWith("@cougarnet.uh.edu")
    ) {
      alert(
        "Registration is restricted. Please use a valid @uh.edu or @cougarnet.uh.edu email address.",
      );
      return; // Stops the function here so it never reaches Supabase
    }
    // ----------------------------------------

    try {
      // Send the data to Supabase and attach the name to the metadata
      const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      // Handle Success
      alert("Account created successfully! Please log in.");

      // Visually toggle back to the login view
      document.getElementById("signupView").classList.add("d-none");
      document.getElementById("loginView").classList.remove("d-none");

      // Clear the input fields
      signupForm.reset();
    } catch (error) {
      alert("Signup failed: " + error.message);
    }
  });
}

// ---------------------------------------------------------
// --- DASHBOARD DISPLAY LOGIC ---
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Detect if we are on the dashboard by looking for the points display element
  const displayPoints = document.getElementById("displayPoints");

  if (displayPoints) {
    // 2. Fetch the current active session
    const {
      data: { session },
      error: sessionError,
    } =     await supabaseClient.auth.getSession();

    // If no session exists, kick them back to login
    if (!session || sessionError) {
      window.location.href = "./login-signup.html";
      return;
    }

    // 3. Fetch the user's specific data from the profiles table
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, points, dues_paid, role")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return;
    }

    // 4. Security Check: Kick out non-verified members who forced their way to this URL
    if (profileData.role !== "officers" && profileData.dues_paid !== true) {
      window.location.href = "./pre-dashboard.html";
      return;
    }

    // 5. Inject the data into your specific HTML IDs
    const userName = profileData.full_name || "Member";
    const userPoints = profileData.points || 0;

    const memberName = document.getElementById("memberName");
    if (memberName) {
      memberName.textContent = userName;
    }
    displayPoints.textContent = userPoints;
  }

  // ---------------------------------------------------------
  // --- GLOBAL LOGOUT LOGIC ---
  // ---------------------------------------------------------
  // Note: Standardized to use id="logoutBtn" across all pages
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = "./login-signup.html";
    });
  }
});
