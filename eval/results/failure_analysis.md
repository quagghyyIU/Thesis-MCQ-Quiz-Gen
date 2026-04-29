# Failure Analysis - 2026-04-29T13:55:12Z

This table lists low-performing topic-level cases for thesis discussion. Common causes include weak retrieval grounding, Bloom distribution drift, and incomplete model output.

| Baseline | Repeat | Document | Topic | Trigger | Value | Likely reason | Suggested mitigation |
| --- | ---: | --- | --- | --- | ---: | --- | --- |
| baseline_vanilla | 1 | it_intro | cia_security | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | it_intro | cloud_models | Bloom mismatch | 26.958 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | db_fundamentals | normalization | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | db_fundamentals | acid_transactions | Bloom mismatch | 13.672 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | db_fundamentals | acid_transactions | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | os_basics | cpu_scheduling | Bloom mismatch | 27.020 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | os_basics | cpu_scheduling | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | os_basics | deadlock_conditions | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | os_basics | deadlock_conditions | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | os_basics | paging_faults | Bloom mismatch | 15.524 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | os_basics | paging_faults | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | vn_network_security | firewall_rules | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | vn_network_security | mfa_security | Bloom mismatch | 26.938 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | vn_network_security | mfa_security | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 1 | vn_network_security | backup_recovery | Bloom mismatch | 18.312 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 1 | vn_network_security | backup_recovery | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | it_intro | cia_security | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | it_intro | cloud_models | Bloom mismatch | 26.958 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | db_fundamentals | acid_transactions | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | os_basics | cpu_scheduling | Bloom mismatch | 27.020 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | os_basics | cpu_scheduling | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | os_basics | deadlock_conditions | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | os_basics | deadlock_conditions | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | os_basics | paging_faults | Bloom mismatch | 15.524 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | os_basics | paging_faults | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | vn_network_security | firewall_rules | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | vn_network_security | mfa_security | Bloom mismatch | 26.938 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | vn_network_security | mfa_security | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 2 | vn_network_security | backup_recovery | Bloom mismatch | 18.312 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 2 | vn_network_security | backup_recovery | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | it_intro | cia_security | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | it_intro | cloud_models | Bloom mismatch | 26.958 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | db_fundamentals | normalization | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | db_fundamentals | normalization | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | db_fundamentals | acid_transactions | Bloom mismatch | 26.938 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | db_fundamentals | acid_transactions | Low judge score | 3.500 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | os_basics | cpu_scheduling | Bloom mismatch | 27.020 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | os_basics | cpu_scheduling | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | os_basics | deadlock_conditions | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | os_basics | deadlock_conditions | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | os_basics | paging_faults | Bloom mismatch | 15.524 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | os_basics | paging_faults | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| baseline_vanilla | 3 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | vn_network_security | mfa_security | Bloom mismatch | 26.938 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_vanilla | 3 | vn_network_security | backup_recovery | Bloom mismatch | 18.312 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | it_intro | cia_security | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | it_intro | cloud_models | Bloom mismatch | 26.958 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | db_fundamentals | normalization | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | db_fundamentals | acid_transactions | Bloom mismatch | 13.672 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | os_basics | cpu_scheduling | Bloom mismatch | 8.933 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 1 | vn_network_security | mfa_security | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | it_intro | cia_security | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | db_fundamentals | normalization | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | db_fundamentals | acid_transactions | Bloom mismatch | 13.672 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | os_basics | cpu_scheduling | Bloom mismatch | 8.933 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | os_basics | deadlock_conditions | Bloom mismatch | 13.122 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 2 | vn_network_security | mfa_security | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | it_intro | cloud_models | Bloom mismatch | 26.958 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | db_fundamentals | normalization | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | db_fundamentals | acid_transactions | Bloom mismatch | 14.018 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | os_basics | cpu_scheduling | Bloom mismatch | 27.020 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | vn_network_security | firewall_rules | Bloom mismatch | 15.906 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| baseline_rag_only | 3 | vn_network_security | mfa_security | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 1 | db_fundamentals | acid_transactions | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 1 | os_basics | cpu_scheduling | Bloom mismatch | 8.447 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 1 | vn_network_security | mfa_security | Bloom mismatch | 13.672 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 2 | db_fundamentals | acid_transactions | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 2 | os_basics | cpu_scheduling | Bloom mismatch | 8.933 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 2 | vn_network_security | firewall_rules | Low judge score | 3.750 | Quality judge found relevance, correctness, clarity, or grounding issues. | Inspect generated item and refine prompt rubric. |
| full_system | 3 | db_fundamentals | acid_transactions | Bloom mismatch | 13.469 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
| full_system | 3 | os_basics | cpu_scheduling | Bloom mismatch | 8.447 | Output Bloom distribution drifted from the topic target. | Strengthen Bloom examples or adjust target pattern instructions. |
