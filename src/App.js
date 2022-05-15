import React, { useState, useEffect, useCallback } from 'react'
import './App.css'


const handleOperators = {
  'equals': (a, b) => {
    if (Array.isArray(b) && b.length === 1) {
      return a === b[0]
    }
    return a === b 
  },
  'greater_than': (a, b) => { return a > b },
  'less_than': (a, b) => { return a < b },
  'any': (a) => { return !!a },
  'in': (a, b) => {
    if (Array.isArray(b)) {
      return b.includes(a)
    }
    return b.toString().split(', ').includes(a.toString())
  },
  'contains': (a, b) => { return a.toLowerCase().includes(`${b.toLowerCase()}`) },
};


function App() {
  // @ts-ignore
  const datastore = window?.datastore 
  const filterDefault = { property: null, operator: null, input: null }

  const [store] = useState(datastore)
  const [properties] = useState(datastore?.getProperties())
  const [operators, setOperators] = useState([])
  const [products, setProducts] = useState(datastore?.getProducts())
  const [filter, setFilter] = useState(filterDefault)

  console.log('a')
  setTimeout(() => console.log('b'), 100)
  setTimeout(() => console.log('c'), 0)
  console.log('d')

  useEffect(() => {
    if(!filter.property || !filter.operator || !filter.input) {
      setProducts(datastore?.getProducts())
      return
    }

    const newProducts = datastore?.getProducts().filter(({ property_values }) => {
      if(filter.operator.id === 'none') {
        return !property_values.some((pv) => pv.property_id === filter.property.id)
      }

      return property_values.find((pv) => {
        return pv.property_id === filter.property.id && handleOperators[filter.operator.id](pv.value, filter.input.value)
      })
    })
    setProducts(newProducts)
  }, [filter, datastore])

  const handleSelectProperty = (e) => {
    if(e.target.value === '') {
      setFilter(filterDefault)
      setOperators([])
      return
    }

    const property = properties.find((property) => property.id === Number(e.target.value))
    setFilter({...filterDefault, property})

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

  const handleSelectOperator = (e) => {
    setFilter((prev) => {
      if(e.target.value === '') return {...prev, operator: null}

      const operator = operators.find((operator) => operator.id === e.target.value)
      return {...prev, operator}
    })
  }

  const handleSelectInput = (e) => {
    setFilter((prev) => {
      if(e.target.value === '') return {...prev, input: null}

      let value = e.target.value

      if(e.target.type === 'number') {
        value = Number(e.target.value)
      }

      if(e.target.type === 'select-multiple') {
        value = Array.from(e.target.selectedOptions, option => option.value)
      }

      const input = { type: e.target.type, value}
      return {...prev, input}
    })
  }

  const handleReset = () => {
    setFilter(filterDefault)
    setOperators([])
  }

  const InputFilter = useCallback(() => {
    if( !filter?.property ) return null

    if( filter?.property?.type === 'number') {
      return <input type='number' onChange={handleSelectInput} />
    }

    if( filter?.property?.type === 'enumerated') {
      return (
        <select multiple onChange={handleSelectInput}>
          {filter?.property?.values.map((value) => {
            return <option key={`select-enum-${value}`}>{value}</option>
          })}
        </select>
      )
    }

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
