import React, { useState, useEffect, useCallback } from 'react'
import './App.css'

// Find match against operators object
const handleOperators = {
  'equals': (a, b) => {
    // If against an array
    if (Array.isArray(b) && b.length === 1) {
      return a === b[0]
    }

    // Defaults to strict comparison
    return a === b 
  },
  'greater_than': (a, b) => { return a > b },
  'less_than': (a, b) => { return a < b },
  'in': (a, b) => {
    // If against an array
    if (Array.isArray(b)) {
      return b.includes(a)
    }

    // Defaults against a string with comma-separated
    return b.toString().split(',').includes(a.toString())
  },
  'contains': (a, b) => { return a.toLowerCase().includes(`${b.toLowerCase()}`) },
};


function App() {
  // Setting up default values
  // @ts-ignore
  const datastore = window?.datastore 
  const filterDefault = { property: null, operator: null, input: null }

  // Setting state
  const [store] = useState(datastore)
  const [properties] = useState(datastore?.getProperties())
  const [operators, setOperators] = useState([])
  const [products, setProducts] = useState(datastore?.getProducts())
  const [filter, setFilter] = useState(filterDefault)

  // Update products list every filter changed
  useEffect(() => {
    // Return default products if:
    // 1) property field is missing
    // 2) operator field is missing
    // 3) operator is not `any` or `none` while input is missing
    if(!filter.property || !filter.operator || (!(filter.operator.id === 'any' || filter.operator.id === 'none') && !filter.input)) {
      setProducts(datastore?.getProducts())
      return
    }

    // Start filtering products
    const newProducts = datastore?.getProducts().filter(({ property_values }) => {
      // Find if `any`
      if(filter.operator.id === 'any') {
        return property_values.find((pv) => pv.property_id === filter.property.id)
      }

      // Find if `none`
      if(filter.operator.id === 'none') {
        return !property_values.some((pv) => pv.property_id === filter.property.id)
      }

      // Find against handleOperator object
      return property_values.find((pv) => {
        return pv.property_id === filter.property.id && handleOperators[filter.operator.id](pv.value, filter.input.value)
      })
    })
    setProducts(newProducts)
  }, [filter, datastore])

  // Run when select property changed
  const handleSelectProperty = (e) => {
    // If no value, reset to default
    if(e.target.value === '') {
      setFilter(filterDefault)
      setOperators([])
      return
    }

    // Find property by selected id and set the filter with new property object, force input to null
    const property = properties.find((property) => property.id === Number(e.target.value))
    setFilter(({operator}) => ({property, operator, input: null}))

    // Set operator options based off property selected
    setOperators(() => datastore.getOperators().filter((operator) => {
      if( property.type === 'number' ) {
        return operator.id === 'equals' || operator.id === 'any' || operator.id === 'none' || operator.id === 'in' || operator.id === 'greater_than' || operator.id === 'less_than'
      }

      if( property.type === 'enumerated' ) {
        return operator.id === 'equals' || operator.id === 'any' || operator.id === 'none' || operator.id === 'in'
      }

      return operator.id === 'equals' || operator.id === 'any' || operator.id === 'none' || operator.id === 'in' || operator.id === 'contains'
    }))
  }

  // Run when select operator changed
  const handleSelectOperator = (e) => {
    // Set filter with new operator
    setFilter((prev) => {
      // If empty, returns operator to null
      if(e.target.value === '') return {...prev, operator: null}

      // Defaults to operator object
      const operator = operators.find((operator) => operator.id === e.target.value)
      return {...prev, operator}
    })
  }

  // Run when input / select value changed
  const handleSelectInput = (e) => {
    // Set filter with new input value
    setFilter((prev) => {
      // If missing, set to null
      if(e.target.value === '') return {...prev, input: null}

      // Value defaults to string
      let value = e.target.value

      // If number, format value to number
      if(e.target.type === 'number') {
        value = Number(e.target.value)
      }

      // If multi select, format value to an array
      if(e.target.type === 'select-multiple') {
        value = Array.from(e.target.selectedOptions, option => option.value)
      }

      const input = { type: e.target.type, value}
      return {...prev, input}
    })
  }

  // Run when clear button clicked
  const handleReset = () => {
    setFilter(filterDefault)
    setOperators([])
  }

  // Component to display the input / multi select
  const InputFilter = useCallback(() => {
    // If null, returns nothing
    if( !filter?.property ) return null

    // If number, returns number input
    if( filter?.property?.type === 'number') {
      return <input type='number' onChange={handleSelectInput} />
    }

    // If enum, returns multi select
    if( filter?.property?.type === 'enumerated') {
      return (
        <select multiple onChange={handleSelectInput}>
          {filter?.property?.values.map((value) => {
            return <option key={`select-enum-${value}`}>{value}</option>
          })}
        </select>
      )
    }

    // Defaults to string input
    return <input type='text' onChange={handleSelectInput} />
  }, [filter?.property])

  if(!store) return null

  return (
    <div className='main-app'>
      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <div>
            <select style={{ textTransform: 'capitalize' }} onChange={handleSelectProperty}>
              <option value=''>Select a Property</option>
              {properties.map(({ id, name }) => {
                return <option key={`select-property-${id}`} value={id}>{name}</option>
              })}
            </select>
          </div>
          <div>
            <select onChange={handleSelectOperator}>
              <option value=''>Select an Operator</option>
              {operators.map(({ id, text }) => {
                return <option key={`select-operator-${id}`} value={id}>{text}</option>
              })}
            </select>
          </div>
          <div>
            <InputFilter />
          </div>
          <div>
            <button type='reset' onClick={handleReset}>Clear</button>
          </div>
        </fieldset>
      </form>
      <table cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            {properties.map(({ name }) => {
              return <th key={`table-header-${name}`}>{name}</th>
            })}
          </tr>
        </thead>
        <tbody>
          {products.map(({ id, property_values }) => {
            return (
              <tr key={`table-row-${id}`}>
                {properties.map(({ id: property_id }) => {
                  const property = property_values.find((prop) => prop.property_id === property_id)
                  return <td key={`table-cell-${id}-${property_id}`}>{property ? property.value : ''}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
