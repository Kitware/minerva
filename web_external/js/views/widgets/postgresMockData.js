minerva.views.PostgresMockData = {
    sources: [
        "student",
        "teacher"
    ],
    filters: {
        student: [
            {
                id: "name",
                label: "Name",
                type: "string"
            },
            {
                id: "age",
                label: "Age",
                type: "integer"
            },
            {
                id: "grade",
                label: "Grade",
                type: "string",
                input: "select",
                values: ["A", "B", "C", "D"]
            },
            {
                id: "organizationname",
                label: "Organization Name",
                type: "string",
                values: ["Company A", "Organization B", "Institute C"]
            },
            {
                id: "dob",
                label: "Date of Birth",
                type: "datetime"
            }
        ],
        teacher: [
            {
                id: "organizationname",
                label: "Organization Name",
                type: "string",
                values: ["Company A", "Organization B", "Institute C"]
            },
            {
                id: "dob",
                label: "Date of Birth",
                type: "datetime"
            }
        ]
    }
}